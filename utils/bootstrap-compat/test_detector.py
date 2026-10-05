"""Real-browser end-to-end contracts; no mocked snapshots."""
import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from detector import Browser, compare, summarize_results  # noqa: E402

class DetectorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.browser = Browser()
        cls.records = []

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        (HERE / 'cycle').mkdir(exist_ok=True)
        (HERE / 'cycle' / 'tests-latest.json').write_text(json.dumps({
            'browser': cls.browser.metadata, 'comparisons': cls.records,
            'summary': summarize_results(cls.records),
            'provenance': json.loads((HERE/'provenance.json').read_text()),
        }, indent=2))

    def pair(self, fixture, mutation, width=768, text='short'):
        baseline = self.browser.snapshot(fixture, '', width, text)
        candidate = self.browser.snapshot(fixture, mutation, width, text)
        differences = compare(baseline, candidate)
        self.records.append(dict(test=self._testMethodName,fixture=fixture, mutation=mutation, width=width,
                                 text=text, baseline=baseline, candidate=candidate,
                                 differences=differences))
        return differences

    def test_browser_lifetime_serializes_sessions(self):
        import fcntl
        import inspect
        import os
        import tempfile
        lock = self.browser._lock_path
        expected_directory = Path(os.environ.get('BOOTSTRAP_COMPAT_LOCK_DIR', tempfile.gettempdir()))
        self.assertEqual(expected_directory / 'bootstrap-compat-selenium.lock', lock)
        source = inspect.getsource(Browser)
        self.assertIn('BOOTSTRAP_COMPAT_LOCK_DIR', source)
        self.assertIn('tempfile.gettempdir()', source)
        with lock.open('a') as handle:
            with self.assertRaises(BlockingIOError):
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)

    def test_same_count_different_node_identity_fails_closed(self):
        before = self.browser.snapshot('webhook')
        self.browser.command('POST','/execute/sync',{'script':"document.querySelector('input').outerHTML='<textarea class=\"form-control\">changed</textarea>';",'args':[]})
        from detector import COLLECT
        after = self.browser.command('POST','/execute/async',{'script':COLLECT,'args':[self.browser.command('POST','/execute/sync',{'script':'return document.querySelector(\"#fixture\").innerHTML','args':[]}),self.browser.css,'']})
        self.assertEqual(len(before['nodes']),len(after['nodes']))
        with self.assertRaisesRegex(ValueError,'identity'):
            compare(before,after)

    def test_frozen_selection_matches_immutable_original_controls(self):
        from detector import frozen_inputs
        inputs = frozen_inputs()
        self.browser.select_css(inputs['css'])
        try:
            for control in inputs['initial']['controls']:
                with self.subTest(fixture=control['fixture'],width=control['width'],text=control['text']):
                    actual=self.browser.snapshot(control['fixture'],width=control['width'],text=control['text'])
                    self.assertEqual([], compare(control['snapshot'],actual))
                    self.assertEqual(inputs['css'],actual['css'])
            self.assertEqual(inputs['css'],[a['url'] for a in self.browser.metadata['assets']])
        finally:
            self.browser.select_css([a['url'] for a in inputs['initial']['browser']['assets']])

    def test_pixel_gate_accepts_identity_and_harmless_restructuring_rejects_mutations(self):
        from detector import pixel_compare, frozen_inputs
        self.browser.select_css(frozen_inputs()['css'])
        directory=HERE/'cycle/test-pixels'
        directory.mkdir(parents=True,exist_ok=True)
        paths=[]
        try:
            for name,mutation in [('baseline',''),('same',''),('harmless','.panel-heading{display:flow-root!important;}'),('font','#fixture{font-size:25px!important;} #fixture .form-control{font-weight:900!important;}'),('layout','#fixture .input-group{margin-left:40px!important;}')]:
                self.browser.snapshot('webhook',mutation)
                path=directory/(name+'.png')
                self.browser.screenshot(path)
                paths.append(path)
            results=pixel_compare([(paths[0],p,directory/(p.stem+'-diff.png')) for p in paths[1:]])
            self.assertEqual([True,True,False,False],[r['accepted'] for r in results])
            self.assertTrue(all(r['threshold']==0 and r['maxChangedPixels']==0 for r in results))
        finally:
            self.browser.select_css([a['url'] for a in frozen_inputs()['initial']['browser']['assets']])

    def test_provenance_rejects_extra_stylesheet_and_browser_drift(self):
        from detector import frozen_inputs, verify_provenance
        inputs=frozen_inputs()
        self.browser.select_css(inputs['css'])
        try:
            actual=self.browser.snapshot('webhook')
            attestation=self.browser.attest(actual)
            verify_provenance(inputs['initial']['browser'], self.browser.metadata, actual, attestation)
            self.assertTrue(attestation['resources'])
            self.browser.command('POST','/execute/sync',{'script':"let s=document.createElement('style');s.textContent='body{outline:0}';document.head.append(s);",'args':[]})
            with self.assertRaisesRegex(ValueError,'stylesheet'):
                self.browser.attest(actual)
            metadata=json.loads(json.dumps(self.browser.metadata))
            metadata['capabilities']['browserVersion']='unapproved'
            with self.assertRaisesRegex(ValueError,'browserVersion'):
                verify_provenance(inputs['initial']['browser'],metadata,actual,attestation)
        finally:
            self.browser.select_css([a['url'] for a in inputs['initial']['browser']['assets']])

    def test_nested_matrix_and_real_focus_disabled_states(self):
        from detector import matrix_cases
        cases=matrix_cases()
        self.assertEqual(216,len(cases))
        self.assertEqual(216,len({c['id'] for c in cases}))
        for boundary in [576,768,992,1200,1400]:
            self.assertTrue({boundary-1,boundary,boundary+1}.issubset({c['width'] for c in cases}))
        for state in ['normal','focus','disabled']:
            case=next(c for c in cases if c['state']==state and c['context']=='nested' and c['fixture']=='webhook')
            actual=self.browser.snapshot(**{k:v for k,v in case.items() if k!='id'})
            self.assertEqual(case['container_width'],actual['nodes'][1]['geometry']['width'])
            self.assertGreater(len(actual['nodes']),len(self.browser.snapshot('webhook')['nodes']))
            self.browser.snapshot(**{k:v for k,v in case.items() if k!='id'})
            status=self.browser.command('POST','/execute/sync',{'script':"return {focus:document.activeElement.tagName,disabled:document.querySelector('button').disabled}",'args':[]})
            if state=='focus': self.assertEqual('BUTTON',status['focus'])
            if state=='disabled': self.assertTrue(status['disabled'])

    def test_immutable_reference_runner_roundtrip(self):
        from detector import capture_reference, check_reference, matrix_cases, frozen_inputs
        import tempfile
        with tempfile.TemporaryDirectory(dir=HERE/'cycle') as temporary:
            root=Path(temporary)
            cases=[matrix_cases()[0],next(c for c in matrix_cases() if c['state']=='disabled')]
            reference=capture_reference(root/'reference',cases=cases,browser=self.browser)
            self.assertEqual(2,reference['case_count'])
            with self.assertRaises(FileExistsError):
                capture_reference(root/'reference',cases=cases,browser=self.browser)
            report=check_reference(root/'reference',root/'same',css_urls=frozen_inputs()['css'],browser=self.browser)
            self.assertEqual({'comparisons':2,'accepted':2,'rejected':0},report['summary'])
            self.assertFalse(report['coverage']['complete_app_coverage'])
            self.assertTrue(report['coverage']['occurrences'])
            image=root/'reference'/reference['cases'][0]['image']
            image.chmod(0o644)
            image.write_bytes(b'corrupted baseline')
            with self.assertRaisesRegex(ValueError,'hash'):
                check_reference(root/'reference',root/'tampered',css_urls=frozen_inputs()['css'],browser=self.browser)
            # Allow TemporaryDirectory to remove the deliberately sealed files.
            for path in (root/'reference').rglob('*'):
                path.chmod(0o755 if path.is_dir() else 0o644)
            (root/'reference').chmod(0o755)

    def test_same_shape_reordered_text_identity_fails_closed(self):
        from detector import COLLECT
        def collect(markup):
            self.browser.snapshot('webhook')
            return self.browser.command('POST','/execute/async',{'script':COLLECT,'args':[markup,self.browser.css,'']})
        before=collect('<span class="text-info">11</span><span class="text-info">22</span>')
        after=collect('<span class="text-info">22</span><span class="text-info">11</span>')
        self.assertEqual(len(before['nodes']),len(after['nodes']))
        with self.assertRaisesRegex(ValueError,'identity'):
            compare(before,after)

    def test_runner_mutations_have_real_pixel_diffs(self):
        from detector import capture_reference,check_reference,matrix_cases,frozen_inputs
        import tempfile
        with tempfile.TemporaryDirectory(dir=HERE/'cycle') as temporary:
            root=Path(temporary)
            cases=[next(c for c in matrix_cases() if c['fixture']=='webhook' and c['context']=='original')]
            capture_reference(root/'reference',cases=cases,browser=self.browser)
            try:
                report=check_reference(root/'reference',root/'font',css_urls=frozen_inputs()['css'],browser=self.browser,mutation='#fixture *{font-weight:900!important;font-size:20px!important;}')
                self.assertEqual(1,report['summary']['rejected'])
                self.assertIn('pixel',report['comparisons'][0])
                self.assertFalse(report['comparisons'][0]['pixel']['accepted'])
            finally:
                for path in (root/'reference').rglob('*'):
                    path.chmod(0o755 if path.is_dir() else 0o644)
                (root/'reference').chmod(0o755)

    def test_redundant_font_face_declaration_preserves_visual_provenance(self):
        from detector import frozen_inputs,verify_provenance
        inputs=frozen_inputs()
        previous=list(self.browser.css)
        self.browser.select_css(inputs['css'])
        try:
            before=self.browser.snapshot('webhook')
            before['attestation']=self.browser.attest(before)
            duplicate=self.browser.command('POST','/execute/sync',{'script':r'''const rule=[...document.styleSheets].flatMap(s=>[...s.cssRules]).find(r=>r.type===CSSRule.FONT_FACE_RULE && r.style.fontFamily.includes('Source Sans') && r.style.fontWeight==='400'); return rule.cssText.replace(/url\(([^)]+)\)/g,(_,url)=>'url("'+new URL(url.replace(/["']/g,''),rule.parentStyleSheet.href).href+'")');''','args':[]})
            after=self.browser.snapshot('webhook',duplicate)
            after['attestation']=self.browser.attest(after)
            self.assertNotEqual(before['fonts'],after['fonts'])
            self.assertEqual([],compare(before,after))
            verify_provenance(inputs['initial']['browser'],self.browser.metadata,after,after['attestation'],before)
        finally:
            self.browser.select_css(previous)

    def test_manifest_accounts_for_omitted_and_dynamic_source_consumers(self):
        from detector import coverage_manifest,matrix_cases
        manifest=coverage_manifest(matrix_cases())
        omitted=[o for o in manifest['occurrences'] if o['pattern']=='text-warning']
        self.assertTrue(omitted,'Do not discard a source class absent from the derived fixture')
        self.assertTrue(all(o['status']=='not-covered-omitted-source-branch' and not o['tests'] for o in omitted))
        dynamic=[o for o in manifest['occurrences'] if o['kind']=='dynamic-class']
        self.assertEqual(2,len(dynamic))
        self.assertTrue(all(not o['tests'] for o in dynamic))

    def test_font_weight_mutation_detected(self):
        for width in [375,768,1280]:
            for text in ['short','long']:
                with self.subTest(width=width,text=text):
                    differences = self.pair('webhook', '#fixture .form-control {font-weight: 900 !important;}',width,text)
                    self.assertTrue(any(d['property'] == 'font-weight' for d in differences),
                                    'Detector failed to report actual Chromium font-weight mutation')

    def test_horizontal_group_becoming_vertical_detected(self):
        for width in [375,768,1280]:
            for text in ['short','long']:
                with self.subTest(width=width,text=text):
                    differences = self.pair('timeline', '#fixture .btn-group {display:inline-flex!important;flex-direction:column!important;}',width,text)
                    self.assertTrue(any(d['property'].startswith('geometry.') for d in differences),
                                    'Detector failed to report horizontal children becoming vertical')
                    self.assertFalse(any(d['property'] == 'display' for d in differences))
                    record=self.records[-1]
                    before=[n for n in record['baseline']['nodes'] if n['tag']=='BUTTON' and n['diagnostic']['display']!='none']
                    after=[n for n in record['candidate']['nodes'] if n['tag']=='BUTTON' and n['diagnostic']['display']!='none']
                    self.assertEqual(before[0]['geometry']['y'],before[1]['geometry']['y'])
                    self.assertNotEqual(after[0]['geometry']['y'],after[1]['geometry']['y'])

    def test_snapshots_include_visual_properties_and_overflow(self):
        snapshot=self.browser.snapshot('webhook')
        self.assertIn('overflow',snapshot['nodes'][0])
        for prop in ['font-size','line-height','color','background-color','border-top-width','box-shadow','opacity']:
            self.assertIn(prop,snapshot['nodes'][0]['visual'])
        self.assertIn('documentOverflow',snapshot)
        self.assertIn('pseudo',snapshot['nodes'][-1])

    def test_scroll_overflow_regression_detected(self):
        differences=self.pair('webhook', '#fixture::after{content:"";position:absolute;left:2000px;top:20px;width:10px;height:1px;}')
        self.assertTrue(any('overflow.' in d['property'] for d in differences),
                        'Detector ignored increased scroll overflow')

    def test_different_node_counts_fail_closed(self):
        baseline = self.browser.snapshot('webhook')
        candidate = self.browser.snapshot('import')
        self.assertNotEqual(len(baseline['nodes']), len(candidate['nodes']))
        with self.assertRaisesRegex(ValueError, 'node count'):
            compare(baseline, candidate)

    def test_mobile_viewport_is_exact(self):
        snapshot=self.browser.snapshot('webhook',width=375)
        self.assertEqual(375,snapshot['viewport']['width'])

    def test_baseline_matrix_accepted(self):
        for fixture in ['timeline','import','webhook']:
            for width in [375,768,1280]:
                for text in ['short','long']:
                    with self.subTest(fixture=fixture,width=width,text=text):
                        self.assertEqual([],self.pair(fixture,'',width,text))

    def test_harmless_restructuring_matrix_accepted(self):
        changed_display=False
        for fixture in ['timeline','import','webhook']:
            for width in [375,768,1280]:
                for text in ['short','long']:
                    with self.subTest(fixture=fixture,width=width,text=text):
                        self.assertEqual([],self.pair(fixture,'.panel-heading {display:flow-root!important;} .unused-detector-selector {display:grid;}',width,text))
                        record=self.records[-1]
                        changed_display |= any(a['diagnostic']['display']!=b['diagnostic']['display'] for a,b in zip(record['baseline']['nodes'],record['candidate']['nodes']))
        self.assertTrue(changed_display,'Control must actually change computed display without changing appearance/layout')

    def test_pseudo_element_color_regression_detected(self):
        differences=self.pair('webhook','#fixture .ri-external-link-line::before{color:rgb(255,0,0)!important;}')
        self.assertTrue(any(d['property']=='pseudo.::before.color' for d in differences),
                        'Detector ignored visible icon pseudo-element color mutation')

    def test_timeline_long_text_is_visible_fixture_content(self):
        self.browser.snapshot('timeline',text='long')
        visible=self.browser.command('POST','/execute/sync',{'script':'return document.body.innerText','args':[]})
        self.assertIn('long translated action description',visible,
                      'Long timeline content cannot be only an invisible tooltip title')

    def test_assets_fonts_and_provenance_are_real(self):
        snapshot=self.browser.snapshot('webhook')
        self.assertTrue(snapshot['fonts'])
        for font in snapshot['fonts']:
            self.assertTrue(font['declared'],font)
            self.assertTrue(font['loaded'],font)
            self.assertTrue(all(f['status']=='loaded' for f in font['loaded']),font)
        resource_urls={r['name'] for r in snapshot['resources']}
        self.assertTrue(set(snapshot['css']).issubset(resource_urls))
        sources=json.loads((HERE/'provenance.json').read_text())
        for source in sources.values():
            lines=(HERE.parents[1]/source['path']).read_text().splitlines(True)
            self.assertEqual(source['snippet'],''.join(lines[source['start_line']-1:source['end_line']]))

    def test_result_summary_matches_real_browser_comparison(self):
        start=len(self.records)
        self.pair('webhook','')
        self.pair('webhook','#fixture .form-control{font-weight:900!important;}')
        summary=summarize_results(self.records[start:])
        self.assertEqual({'comparisons':2,'accepted':1,'rejected':1},summary)

class RunnerCLITests(unittest.TestCase):
    def test_capture_cli_writes_full_real_browser_reference(self):
        import subprocess
        import tempfile
        with tempfile.TemporaryDirectory(dir=HERE/'cycle') as temporary:
            reference=Path(temporary)/'reference'
            process=subprocess.run(['python3',str(HERE/'cycle/run.py'),'capture','--reference',str(reference)],text=True,capture_output=True)
            try:
                self.assertEqual(0,process.returncode,process.stdout+process.stderr)
                manifest=json.loads((reference/'reference.json').read_text())
                self.assertEqual(216,manifest['case_count'])
                self.assertEqual(18,manifest['original_controls_verified'])
                self.assertEqual(18,sum(e['original_control'] for e in manifest['cases']))
            finally:
                if reference.exists():
                    for path in reference.rglob('*'):
                        path.chmod(0o755 if path.is_dir() else 0o644)
                    reference.chmod(0o755)


if __name__ == '__main__':
    unittest.main(verbosity=2)

"""Compare public Bootstrap 3 contracts in isolated Chromium pages."""
import importlib.util
import json
import hashlib
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('router_contracts', HERE / 'test_adapter.py')
assert spec is not None and spec.loader is not None
router_contracts = importlib.util.module_from_spec(spec)
spec.loader.exec_module(router_contracts)

CASES = {
    'button_loading_reset': "const b=$('<button data-loading-text=\"Waiting\">Original</button>').appendTo('body');b.button('loading');await sleep(30);const loading=[b.html(),b.prop('disabled'),b.hasClass('disabled')];b.button('reset');await sleep(30);return {loading,reset:[b.html(),b.prop('disabled'),b.hasClass('disabled')]};",
    'button_custom_state': "const b=$('<input value=\"Original\">').appendTo('body');b.button({loadingText:'Busy',doneText:'Done'}).button('loading');await sleep(30);const loading=b.val();b.button('done');await sleep(30);return {loading,done:b.val(),disabled:b.prop('disabled')};",
    'button_radio_group': "const first=$('#radio-one'),second=$('#radio-two');let changes=0;$('#choice-two').on('change',()=>changes++);second.button('toggle');second.button('toggle');return {first:first.hasClass('active'),second:second.hasClass('active'),checked:$('#choice-two').prop('checked'),changes};",
    'button_checkbox_group': "const button=$('#check-button');let changes=0;$('#check-choice').on('change',()=>changes++);button.button('toggle');const first=$('#check-choice').prop('checked');button.button('toggle');return {first,second:$('#check-choice').prop('checked'),active:button.hasClass('active'),changes};",
    'button_standalone': "const button=$('<button class=\"btn\">Toggle</button>').appendTo('body');const chain=button.button('toggle')===button;const first=[button.hasClass('active'),button.attr('aria-pressed')];button.button('toggle');return {chain,first,second:[button.hasClass('active'),button.attr('aria-pressed')]};",
    'modal_lifecycle': "const modal=$('#modal');const events=[];modal.on('show.bs.modal shown.bs.modal hide.bs.modal hidden.bs.modal',event=>events.push(event.type));const chain=modal.modal({show:false})===modal;modal.modal('show');await sleep(100);const shown=modal.data('bs.modal').isShown;modal.modal('hide');await sleep(100);return {chain,shown,hidden:modal.data('bs.modal').isShown,events};",
    'modal_cancel_show': "const modal=$('#modal');let shown=0;modal.on('show.bs.modal',event=>event.preventDefault()).on('shown.bs.modal',()=>shown++);modal.modal({show:false}).modal('show');await sleep(100);return {shown,isShown:Boolean(modal.data('bs.modal').isShown)};",
    'modal_remote': "const modal=$('#modal');let loaded=0;modal.on('loaded.bs.modal',()=>loaded++);modal.modal({show:false,remote:'remote-content.html'});await sleep(300);modal.modal({show:false,remote:'remote-content.html'});await sleep(50);return {loaded,content:modal.find('.remote-content').text()};",
    'tooltip_template': "const trigger=$('#tip');trigger.tooltip({trigger:'manual',animation:false,template:'<div class=\"tooltip contract-tip\" role=\"tooltip\"><div class=\"tooltip-arrow arrow\"></div><div class=\"tooltip-inner\"></div></div>'}).tooltip('show');await sleep(50);const visible={text:$('.tooltip-inner').text(),custom:$('.contract-tip').length};trigger.tooltip('hide');await sleep(50);return {visible,hidden:$('.contract-tip').length};",
    'popover_template': "const trigger=$('#pop');trigger.popover({trigger:'manual',animation:false,template:'<div class=\"popover contract-pop\" role=\"tooltip\"><div class=\"arrow\"></div><h3 class=\"popover-title\"></h3><div class=\"popover-content\"></div></div>'}).popover('show');await sleep(50);const tip=$('.contract-pop');return {text:tip.text().trim(),custom:tip.length};",
    'tooltip_title_refresh': "const trigger=$('#tip');trigger.tooltip({trigger:'manual',animation:false});trigger.attr('data-original-title','Updated').tooltip('fixTitle');trigger.tooltip({trigger:'manual',animation:false}).tooltip('show');await sleep(50);return {text:$('.tooltip-inner').text()};",
    'collapse_lifecycle': "const panel=$('<div class=\"collapse\">Content</div>').appendTo('body');const events=[];panel.on('show.bs.collapse shown.bs.collapse hide.bs.collapse hidden.bs.collapse',event=>events.push(event.type));panel.collapse({toggle:false}).collapse('show');await sleep(450);const visible=panel.height()>0;panel.collapse('hide');await sleep(450);const rect=panel[0].getBoundingClientRect();return {visible,hidden:rect.width===0&&rect.height===0,events};",
    'tab_lifecycle': "const events=[];$('#tab-one,#tab-two').on('hide.bs.tab hidden.bs.tab show.bs.tab shown.bs.tab',event=>events.push({type:event.type,target:event.target.id,related:event.relatedTarget.id}));$('#tab-two').tab('show');await sleep(100);return {events,first:$('#pane-one').hasClass('active'),second:$('#pane-two').hasClass('active')};",
    'alert_close': "const alert=$('<div class=\"alert\">Alert</div>').appendTo('body');const events=[];alert.on('close.bs.alert closed.bs.alert',event=>events.push(event.type));alert.alert('close');await sleep(50);return {events,connected:document.body.contains(alert[0])};",
    'carousel_navigation': "const carousel=$('<div class=\"carousel\"><div class=\"carousel-inner\"><div class=\"item carousel-item active\">One</div><div class=\"item carousel-item\">Two</div></div></div>').appendTo('body');const events=[];carousel.on('slide.bs.carousel slid.bs.carousel',event=>events.push({type:event.type,direction:event.direction}));carousel.carousel({interval:false});carousel.carousel('next');await sleep(100);const next=carousel.find('.active').text();carousel.carousel(0);await sleep(100);return {next,current:carousel.find('.active').text(),events};",
    'affix_state': "const element=$('<div>Affixed</div>').appendTo('body');const chain=element.affix({offset:10})===element;const instance=element.data('bs.affix');return {chain,top:element.hasClass('affix-top'),state:instance.getState(1000,10,0,10),constructor:typeof $.fn.affix.Constructor};",
    'scrollspy_refresh_process': "const nav=$('<div id=\"spy-nav\"><ul class=\"nav\"><li><a href=\"#spy-one\">One</a></li><li><a href=\"#spy-two\">Two</a></li></ul></div>').appendTo('body');const root=$('<div style=\"position:relative;height:100px;overflow:auto\"><div id=\"spy-one\" style=\"height:200px\">One</div><div id=\"spy-two\" style=\"height:200px\">Two</div></div>').appendTo('body');const events=[];nav.on('activate.bs.scrollspy',event=>events.push($(event.target).find('a').attr('href')));const chain=root.scrollspy({target:'#spy-nav',offset:10})===root;root.scrollTop(220);root.scrollspy('process');root.scrollspy('refresh');await sleep(50);const instance=root.data('bs.scrollspy');return {chain,active:instance.activeTarget,targets:instance.targets,events,parent:nav.find('li.active a').attr('href')};",
    'tooltip_disable_enable_toggle': "const trigger=$('#tip');trigger.tooltip({trigger:'manual',animation:false}).tooltip('disable').tooltip('show');await sleep(50);const disabled=$('.tooltip').length;trigger.tooltip('enable').tooltip('toggle');await sleep(50);const enabled=$('.tooltip-inner').text();trigger.tooltip('toggle');await sleep(50);trigger.tooltip('destroy');return {disabled,enabled,hidden:$('.tooltip').length,data:Boolean(trigger.data('bs.tooltip'))};",
    'popover_lifecycle': "const trigger=$('#pop');const events=[];trigger.on('show.bs.popover shown.bs.popover hide.bs.popover hidden.bs.popover',event=>events.push(event.type));trigger.popover({trigger:'manual',animation:false}).popover('show');await sleep(50);trigger.popover('hide');await sleep(50);trigger.popover('destroy');return {events,data:Boolean(trigger.data('bs.popover')),hidden:$('.popover').length};",
    'collapse_cancel_show': "const element=$('<div class=\"collapse\">Content</div>').appendTo('body');const events=[];element.on('show.bs.collapse',event=>{events.push(event.type);event.preventDefault()}).on('shown.bs.collapse',event=>events.push(event.type));element.collapse({toggle:false}).collapse('show');await sleep(450);return {events,visible:element[0].getBoundingClientRect().height>0};",
    'alert_cancel_close': "const element=$('<div class=\"alert\">Content</div>').appendTo('body');let closed=0;element.on('close.bs.alert',event=>event.preventDefault()).on('closed.bs.alert',()=>closed++);element.alert('close');return {closed,connected:document.body.contains(element[0])};",
    'dropdown_lifecycle': "const parent=$('#legacy-dropdown'),trigger=$('#dropdown-toggle');const events=[];parent.on('show.bs.dropdown shown.bs.dropdown hide.bs.dropdown hidden.bs.dropdown',event=>events.push(event.type));trigger.dropdown('toggle');await sleep(50);const open=parent.find('.dropdown-menu')[0].getBoundingClientRect().height>0;trigger.dropdown('toggle');await sleep(50);return {events,open,hidden:parent.find('.dropdown-menu')[0].getBoundingClientRect().height===0};",
    'button_group_data_api': "$('#radio-two').trigger('click');return {first:$('#choice-one').prop('checked'),second:$('#choice-two').prop('checked'),active:$('#radio-two').hasClass('active')};",
    'collapse_initial_in': "const element=$('#legacy-collapse');element.collapse({toggle:false});const initial=element[0].getBoundingClientRect().height>0;element.collapse('hide');await sleep(450);return {initial,hidden:element[0].getBoundingClientRect().height===0,legacy:element.hasClass('in')};",
    'carousel_legacy_markup': "const element=$('<div class=\"carousel\"><div class=\"carousel-inner\"><div class=\"item active\">One</div><div class=\"item\">Two</div></div></div>').appendTo('body');element.carousel({interval:false}).carousel('next');await sleep(100);return {active:element.find('.item.active').text()};",
    'tab_legacy_parent': "$('#tab-two').tab('show');await sleep(100);return {first:$('#tab-one').parent().hasClass('active'),second:$('#tab-two').parent().hasClass('active')};",
    'plugin_no_conflict': "const plugin=$.fn.modal;const returned=plugin.noConflict();const restored=$.fn.modal!==plugin;$.fn.modal=returned;return {returned:returned===plugin,restored};",
    'modal_instance_methods': "const element=$('#modal');element.modal({show:false});const instance=element.data('bs.modal');instance.show();await sleep(100);const shown=instance.isShown;instance.hide();await sleep(100);return {shown,hidden:instance.isShown,element:instance.$element[0]===element[0]};",
    'modal_defaults': "$.fn.modal.Constructor.DEFAULTS.keyboard=false;$.fn.modal.Constructor.DEFAULTS.show=false;const element=$('#modal');element.modal();const instance=element.data('bs.modal');return {keyboard:instance.options.keyboard,shown:Boolean(instance.isShown)};",
    'tooltip_defaults': "$.fn.tooltip.Constructor.DEFAULTS.animation=false;$.fn.tooltip.Constructor.DEFAULTS.trigger='manual';const element=$('#tip');element.tooltip().tooltip('show');await sleep(50);return {animation:element.data('bs.tooltip').options.animation,text:$('.tooltip-inner').text()};",
    'modal_data_show_false': "const element=$('#modal');element.attr('data-show','false').modal();return {shown:Boolean(element.data('bs.modal').isShown)};",
    'tooltip_collection_options': "const first=$('<button title=\"First\" data-placement=\"top\">First</button>').appendTo('body'),second=$('<button title=\"Second\" data-placement=\"bottom\">Second</button>').appendTo('body');const collection=first.add(second);const chain=collection.tooltip({trigger:'manual',animation:false})===collection;return {chain,first:first.data('bs.tooltip').options.placement,second:second.data('bs.tooltip').options.placement};",
    'tooltip_data_sanitize_cannot_disable': "const element=$('<button data-sanitize=\"false\" title=\"&lt;img src=x onerror=alert(1)&gt;\">Tip</button>').appendTo('body');element.tooltip({trigger:'manual',animation:false,html:true}).tooltip('show');await sleep(50);return {sanitize:element.data('bs.tooltip').options.sanitize,unsafe:Boolean($('.tooltip-inner img').attr('onerror'))};",
    'tooltip_whitelist': "const element=$('#tip');element.attr('title','<b>Bold</b><i>Italic</i>').tooltip({trigger:'manual',animation:false,html:true,whiteList:{'*':['class','role'],div:[],b:[]}}).tooltip('show');await sleep(50);return {html:$('.tooltip-inner').html()};",
    'popover_data_template': "const element=$('#pop');element.attr('data-template','<div class=\"popover custom-data\" role=\"tooltip\"><div class=\"arrow\"></div><h3 class=\"popover-title\"></h3><div class=\"popover-content\"></div></div>').popover({trigger:'manual',animation:false}).popover('show');await sleep(50);return {count:$('.custom-data').length,text:$('.custom-data').text().trim()};",
    'empty_collections': "const collection=$('.nonexistent');return {modal:collection.modal('show')===collection,tooltip:collection.tooltip('destroy')===collection,collapse:collection.collapse('hide')===collection};",
    'instance_available_during_modal_show': "const element=$('#modal');let present=false;element.on('show.bs.modal',()=>present=Boolean(element.data('bs.modal')));element.modal();await sleep(100);return {present};",
    'modal_related_target': "const element=$('#modal'),trigger=$('#opener')[0];const targets=[];element.on('show.bs.modal shown.bs.modal',event=>targets.push(event.relatedTarget===trigger));element.modal({show:false}).modal('show',trigger);await sleep(100);return {targets};",
    'modal_cancel_hide': "const element=$('#modal');let hidden=0;element.modal();await sleep(100);element.on('hide.bs.modal',event=>event.preventDefault()).on('hidden.bs.modal',()=>hidden++);element.modal('hide');await sleep(100);return {shown:element.data('bs.modal').isShown,hidden};",
    'modal_toggle': "const element=$('#modal');element.modal({show:false}).modal('toggle');await sleep(100);const shown=element.data('bs.modal').isShown;element.modal('toggle');await sleep(100);return {shown,hidden:element.data('bs.modal').isShown};",
    'collapse_default_toggle': "const element=$('<div class=\"collapse\">Content</div>').appendTo('body');element.collapse();await sleep(450);return {visible:element[0].getBoundingClientRect().height>0};",
    'tooltip_no_instance_hide': "const element=$('#tip');element.tooltip('hide');return {data:Boolean(element.data('bs.tooltip'))};",
    'tooltip_html_function': "const element=$('#tip');element.removeAttr('title').tooltip({trigger:'manual',animation:false,html:true,title:function(){return '<b>'+this.textContent+'</b>';}}).tooltip('show');await sleep(50);return {html:$('.tooltip-inner').html()};",
    'tooltip_delay_hover': "const element=$('#tip');element.tooltip({animation:false,delay:{show:30,hide:30}});element[0].dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));const before=$('.tooltip').length;await sleep(80);const shown=$('.tooltip-inner').text();element[0].dispatchEvent(new MouseEvent('mouseout',{bubbles:true,relatedTarget:document.body}));await sleep(80);return {before,shown,hidden:$('.tooltip').length};",
    'tooltip_instance_tip': "const element=$('#tip');element.tooltip({trigger:'manual',animation:false}).tooltip('show');await sleep(50);const tip=element.data('bs.tooltip').tip();return {text:tip.find('.tooltip-inner').text(),legacy:tip.hasClass('in'),arrow:tip.find('.tooltip-arrow').length};",
    'popover_legacy_content_selectors': "const element=$('#pop');element.popover({trigger:'manual',animation:false}).popover('show');await sleep(50);const tip=element.data('bs.popover').tip();return {title:tip.find('.popover-title').text(),content:tip.find('.popover-content').text(),arrow:tip.find('.arrow').length};",
    'button_instance_state': "const element=$('<button>Original</button>').appendTo('body');element.button('loading');await sleep(30);const instance=element.data('bs.button');const loading=instance.isLoading;instance.setState('reset');await sleep(30);return {loading,reset:instance.isLoading,text:element.html()};",
    'tab_cancel_show': "$('#tab-two').on('show.bs.tab',event=>event.preventDefault()).tab('show');await sleep(100);return {first:$('#pane-one').hasClass('active'),second:$('#pane-two').hasClass('active')};",
    'transition_emulation': "const element=$('<div>Transition</div>').appendTo('body');let ended=0;element.one('bsTransitionEnd',()=>ended++);const chain=element.emulateTransitionEnd(10)===element;await sleep(50);return {chain,ended,supported:Boolean($.support.transition)};",
    'button_reinitialization': "const element=$('<button>Original</button>').appendTo('body');element.button({loadingText:'First'}).button({loadingText:'Second'}).button('loading');await sleep(30);return {text:element.html(),configured:element.data('bs.button').options.loadingText};",
    'button_defaults': "$.fn.button.Constructor.DEFAULTS.loadingText='Custom default';const element=$('<button>Original</button>').appendTo('body');element.button().button('loading');await sleep(30);return {text:element.html(),loading:element.data('bs.button').isLoading};",
    'tooltip_viewport_object': "const element=$('#tip');element.tooltip({trigger:'manual',animation:false,viewport:{selector:'body',padding:8}}).tooltip('show');await sleep(50);return {text:$('.tooltip-inner').text(),visible:$('.tooltip-inner')[0].getBoundingClientRect().height>0};",
    'tooltip_delegation_dynamic_instance': "const parent=$('<div></div>').appendTo('body');parent.tooltip({selector:'.delegated',animation:false,trigger:'hover'});const child=$('<button class=\"delegated\" title=\"Delegated\">Child</button>').appendTo(parent);let during=false;child.on('show.bs.tooltip',()=>during=Boolean(child.data('bs.tooltip')));child[0].dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));await sleep(80);return {text:$('.tooltip-inner').text(),during,instance:Boolean(child.data('bs.tooltip'))};",
    'tooltip_viewport_function': "const element=$('#tip');let context=false;element.tooltip({trigger:'manual',animation:false,viewport:function(collection){context=collection[0]===element[0]&&this.$element[0]===element[0];return document.body;}}).tooltip('show');await sleep(50);return {context,text:$('.tooltip-inner').text()};",
    'tooltip_viewport_disabled': "const element=$('#tip');element.tooltip({trigger:'manual',animation:false,viewport:false}).tooltip('show');await sleep(50);return {text:$('.tooltip-inner').text()};",
}


class DifferentialContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.records = []
        sources = json.loads((HERE / 'reference/sources.json').read_text())
        for name, metadata in sources.items():
            source = HERE / 'reference' / metadata.get('file', name + '.js')
            assert hashlib.sha256(source.read_bytes()).hexdigest() == metadata['sha256']
        for component, installer in [('affix', 'Affix'), ('transition', 'Transition')]:
            expected = 'window.MauticInstallLegacy' + installer + ' = function (jQuery) {\n' + (HERE / 'reference' / (component + '.js')).read_text() + '\n};\n'
            assert (HERE / (component + '-exception.js')).read_text() == expected
        router_contracts.Contracts.setUpClass.__func__(cls)

    @classmethod
    def tearDownClass(cls):
        report = {'capabilities': cls.capabilities, 'records': cls.records}
        (HERE / 'logs/differential-results.json').write_text(json.dumps(report, indent=2) + '\n')
        cls.command('DELETE', '')
        cls.lock.close()
    call = classmethod(router_contracts.Contracts.call.__func__)
    command = classmethod(router_contracts.Contracts.command.__func__)
    records = []

    def observe(self, baseline, body):
        suffix = '?baseline' if baseline else ''
        self.command('POST', '/url', {'url': router_contracts.APP + '/utils/bootstrap-compat/adapter/fixture.html' + suffix})
        script = "const done=arguments[arguments.length-1];fixtureReady.then(async()=>{const $=mQuery,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));" + body + "}).then(done).catch(error=>done({error:String(error),stack:error.stack}));"
        result = self.command('POST', '/execute/async', {'script': script, 'args': []})
        self.assertNotIn('error', result)
        logs = self.command('POST', '/se/log', {'type': 'browser'})
        self.assertFalse([entry for entry in logs if entry['level'] == 'SEVERE' and entry.get('source') == 'javascript'], logs)
        return result

    def compare(self, name, body):
        baseline = self.observe(True, body)
        candidate = self.observe(False, body)
        self.records.append({'contract': name, 'baseline': baseline, 'candidate': candidate})
        self.assertEqual(baseline, candidate, name)


for contract_name, contract_body in CASES.items():
    def contract(self, name=contract_name, body=contract_body):
        self.compare(name, body)
    setattr(DifferentialContracts, 'test_' + contract_name, contract)


if __name__ == '__main__':
    unittest.main(verbosity=2)

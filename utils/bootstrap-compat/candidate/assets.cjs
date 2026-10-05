const fs=require('fs'),path=require('path');
const h=__dirname,r=path.resolve(h,'../../..');
let css=fs.readFileSync(path.join(h,'app.css'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(r,'assets/build/manifest.json')));
css=css.replace(/url\(["']?([^)'" ]+)["']?\)/g,(whole,url)=>{
if(url.startsWith('data:')||url.startsWith('/')||url.startsWith('http'))return whole;
const [name,query]=url.split('?'); const mapped=manifest['css/'+name];
if(!mapped)throw Error('Unmapped asset '+url);
return 'url("'+mapped+(query?'?'+query:'')+'")';});
fs.writeFileSync(path.join(h,'app.css'),css+'\n/* Mautic application bundle (not Bootstrap): media/css/app.css */\n'+fs.readFileSync(path.join(r,'media/css/app.css'),'utf8'));
const crypto=require('crypto'); const manifestPath=path.join(h,'css-manifest.json');
const report=JSON.parse(fs.readFileSync(manifestPath));
report.application_bundle={path:'media/css/app.css',sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(r,'media/css/app.css'))).digest('hex')};
report.emission_order=['Bootstrap 5.3.8 global','legacy symbol environment (isolated from BS5)','selected legacy differential','Mautic app.scss customization imports (libraries excluded except Remix Icon)','changed shared contracts','media/css/app.css application bundle'];
report.final_css={path:'utils/bootstrap-compat/candidate/app.css',bytes:fs.statSync(path.join(h,'app.css')).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(h,'app.css'))).digest('hex')};
report.coverage={controls:18,fixtures:['timeline','import','webhook'],widths:[375,768,1280],texts:['short','long'],untested:['modal/tooltip styles included but interactions and visuals untested','other routes','Chosen/multiselect/colorpicker/emoji/typeahead/datetimepicker/jvectormap/at library CSS omitted','dynamic consumer inventory incomplete']};
report.mautic_sources=[...fs.readFileSync(path.join(h,'_mautic.scss'),'utf8').matchAll(/@import '([^']+)';/g)].map(m=>m[1]);
fs.writeFileSync(manifestPath,JSON.stringify(report,null,2));

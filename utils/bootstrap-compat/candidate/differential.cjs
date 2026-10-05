// AST-level differential: preserve ordered rules, duplicate declarations and contexts.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const h=__dirname,postcss=require('../toolchain/node_modules/postcss');
const parse=f=>postcss.parse(fs.readFileSync(path.join(h,f),'utf8'),{from:f});
const context=n=>{let a=[];for(let p=n.parent;p&&p.type!=='root';p=p.parent)a.unshift('@'+p.name+' '+p.params);return a.join('|');};
const modern=parse('bootstrap5.css'), legacy=parse('legacy-reference.css');
const {SourceMapConsumer}=require('../toolchain/node_modules/source-map-js');
const sourceMap=new SourceMapConsumer(JSON.parse(fs.readFileSync(path.join(h,'legacy-reference.css.map'),'utf8')));
const latest=new Map();modern.walkRules(r=>r.walkDecls(d=>latest.set(context(r)+'|'+r.selector+'|'+d.prop,d.value+'|'+!!d.important)));
const decisions=[];legacy.walkRules(r=>{r.walkDecls(d=>{const same=latest.get(context(r)+'|'+r.selector+'|'+d.prop)===d.value+'|'+!!d.important;decisions.push({selector:r.selector,context:context(r),property:d.prop,value:d.value,decision:same?'same-target-declaration':'emit-compatibility',line:d.source.start.line,source:sourceMap.originalPositionFor({line:d.source.start.line,column:d.source.start.column-1})});if(same)d.remove();});if(!r.nodes.length)r.remove();});
legacy.walkComments(c=>c.remove());
fs.writeFileSync(path.join(h,'_differential.scss'),'/* Generated component differential; see css-manifest.json. Not a full Bootstrap 3 stylesheet. */\n'+legacy.toString());
const root=path.resolve(h,'../../..'); const amap=JSON.parse(fs.readFileSync(path.join(root,'assets/build/manifest.json')));const frozen=path.join(root,amap['css/app.scss']);const full=postcss.parse(fs.readFileSync(frozen,'utf8'));let rules=0,declarations=0;const families={};full.walkRules(r=>{rules++;r.walkDecls(()=>declarations++);const k=(r.selector.match(/\.(btn|panel|form|input|col|modal|tooltip|well)[-\w]*/)||[])[1]||'other';families[k]=(families[k]||0)+1;});
fs.writeFileSync(path.join(h,'css-manifest.json'),JSON.stringify({bootstrap:'5.3.8',sass:'1.69.7',strategy:'Bootstrap 5 global module + original Mautic custom SCSS + ordered property differential from selected legacy source families',legacy_source_components:['normalize','scaffolding','type','forms','buttons','button-groups','input-groups','panels','wells','modals','tooltip','close'],legacy_symbols:'fresh Sass global scope after isolated Bootstrap 5 @use; Bootstrap3 variables + Mautic custom variables + mixins, not complete Bootstrap3 emitted styles',full_baseline_analysis:{path:frozen,sha256:crypto.createHash('sha256').update(fs.readFileSync(frozen)).digest('hex'),rules,declarations,families},decisions},null,2));

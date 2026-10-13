import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { render } from './render.mjs';
const ref=await build({entryPoints:['tests/reference/badge.tsx'],bundle:true,write:false,format:'iife',jsx:'automatic',alias:{'@':resolve('tests/reference/src')},define:{'process.env.NODE_ENV':'"production"'}});
const theme=readFileSync('tests/reference/badge.generated.css','utf8');
const css=readFileSync('../css/99.acervo-badge.css','utf8');
const font=readFileSync('../css/fonts/acervo-manrope-400.ttf').toString('base64');
const instant=Date.UTC(2024,0,1);
async function scene(page,original,options,dark){
  const style=`${theme}@font-face{font-family:Manrope;src:url(data:font/ttf;base64,${font})}@font-face{font-family:"Acervo Manrope";src:url(data:font/ttf;base64,${font})}body{display:flex;align-items:flex-start;margin:0;padding:48px}#reference{display:contents}`;
  await page.setContent(`<html class="${dark?'dark':''}"><style>${style}${original?'':css}</style><body>${original?'<div id="reference"></div>':render('acervo-badge',options)}</body></html>`);
  await page.evaluate((options)=>{window.referenceOptions=options;window.starts=new WeakMap();},options);
  if(original)await page.addScriptTag({content:ref.outputFiles[0].text});
  await page.evaluate(()=>document.fonts.ready);
}
async function snapshot(page){return page.locator('[data-component],#reference>*').evaluate(async(element)=>{
  for(const animation of document.getAnimations()){
    if(!window.starts.has(animation))window.starts.set(animation,window.interactionTime);
    animation.pause();animation.currentTime=performance.now()-window.starts.get(animation);await animation.ready;
  }
  const style=getComputedStyle(element);return {bounds:element.getBoundingClientRect().toJSON(),background:style.backgroundColor,color:style.color,border:style.borderColor,shadow:style.boxShadow,font:style.fontWeight};
});}
test.describe.configure({mode:'parallel'});
for(const dark of[false,true])for(const reducedMotion of['no-preference','reduce'])for(const variant of['default','secondary','destructive','outline']){
  test(`badge trajectory ${dark} ${reducedMotion} ${variant}`,async({browser},info)=>{
    const context=await browser.newContext({reducedMotion});const original=await context.newPage();const native=await context.newPage();
    await original.clock.install({time:new Date(instant)});const options={variant,children:'Badge',attributes:{tabindex:0}};
    await scene(original,true,options,dark);await scene(native,false,options,dark);await original.clock.pauseAt(new Date(instant+1000));await original.clock.runFor(1000);
    const trajectories=[];
    for(const step of['initial','hover','leave','focus','blur','variant']){
      for(const[page,source]of[[original,true],[native,false]]){
        await page.evaluate(()=>{window.interactionTime=performance.now();});
        if(step==='hover')await page.mouse.move(64,58);
        if(step==='leave')await page.mouse.move(0,0);
        if(step==='focus')await page.locator('[data-component],#reference>*').focus();
        if(step==='blur')await page.locator('[data-component],#reference>*').evaluate((element)=>element.blur());
        if(step==='variant')await page.evaluate((source)=>{if(source)window.referenceUpdate({variant:'secondary'});else document.querySelector('[data-component]').dataset.variant='secondary';},source);
      }
      for(const elapsed of[16,16,32,64,128]){
        await original.clock.runFor(elapsed);const expected=await snapshot(original);const actual=await snapshot(native);trajectories.push({step,elapsed,expected,actual});expect(actual).toEqual(expected);
        const clip={x:32,y:32,width:120,height:80};const first=await original.screenshot({clip});const second=await native.screenshot({clip});const left=PNG.sync.read(first),right=PNG.sync.read(second);const pixels=pixelmatch(left.data,right.data,null,left.width,left.height,{threshold:.05});
        if(pixels){writeFileSync(info.outputPath('react.png'),first);writeFileSync(info.outputPath('twig.png'),second);}expect(pixels).toBe(0);
      }
    }
    writeFileSync(info.outputPath('trajectories.json'),JSON.stringify(trajectories,null,2));await context.close();
  });
}
for(const children of[0,'0',true,false,'<script>&','Long badge'])test(`badge content ${JSON.stringify(children)}`,async({browser})=>{
  const context=await browser.newContext();const original=await context.newPage(),native=await context.newPage();await scene(original,true,{children},false);await scene(native,false,{children},false);
  expect(await native.locator('[data-component]').textContent()).toBe(await original.locator('#reference>div').textContent());await context.close();
});
for(const tag of['a','button'])test(`badge child slot ${tag}`,async({browser})=>{
  const context=await browser.newContext();const original=await context.newPage(),native=await context.newPage();const options={asChild:true,tag,children:'Child',attributes:{title:'parent',...(tag==='button'?{disabled:true}:{})},childAttributes:{title:'child',...(tag==='a'?{href:'#target'}:{type:'button',disabled:false})},childClassName:'child'};
  await scene(original,true,options,false);await scene(native,false,options,false);
  for(const page of[original,native]){await expect(page.locator(tag)).toHaveAttribute('title','child');await expect(page.locator(tag)).toHaveClass(/child/);await page.locator(tag).focus();await expect(page.locator(tag)).toBeFocused();}
  const left=PNG.sync.read(await original.screenshot()),right=PNG.sync.read(await native.screenshot());expect(pixelmatch(left.data,right.data,null,left.width,left.height,{threshold:.05})).toBe(0);await context.close();
});
test('null variant removes the default variant utility',async({browser})=>{
  const context=await browser.newContext();const original=await context.newPage(),native=await context.newPage();await scene(original,true,{variant:null,children:'Badge'},false);await scene(native,false,{variant:null,children:'Badge'},false);
  expect(await snapshot(native)).toEqual(await snapshot(original));await context.close();
});

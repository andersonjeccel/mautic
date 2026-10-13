import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { render } from './render.mjs';
const reference = await build({entryPoints:['tests/reference/label.tsx'],bundle:true,write:false,format:'iife',jsx:'automatic',alias:{'@':resolve('tests/reference/src')},define:{'process.env.NODE_ENV':'"production"'}});
const theme = readFileSync('tests/reference/label.generated.css','utf8');
const css = readFileSync('../css/99.acervo-label.css','utf8');
const script = readFileSync('../js/99.acervo-label.js','utf8');
const font = readFileSync('../css/fonts/acervo-manrope-400.ttf').toString('base64');
async function scene(page, original, options={},dark=false,disabled=false){
  const common=`${theme}@font-face{font-family:Manrope;src:url(data:font/ttf;base64,${font})}@font-face{font-family:"Acervo Manrope";src:url(data:font/ttf;base64,${font})}body{margin:0;padding:32px}#reference{display:contents}input{display:block;margin:0 0 8px;width:120px;height:24px}`;
  await page.setContent(`<html class="${dark?'dark':''}"><style>${common}${original?'':css}</style><body>${original?'<div id="reference"></div>':`<input id="field" class="peer" ${disabled?'disabled':''}>${render('acervo-label',{children:'Field label',...options})}`}</body></html>`);
  await page.evaluate((options)=>{window.referenceOptions=options;window.events=[];},options);
  await page.addScriptTag({content:original?reference.outputFiles[0].text:script});
  await page.locator('#field').evaluate((field,disabled)=>{field.disabled=disabled;},disabled);
  if(!original)await page.evaluate(()=>window.MauticUI.AcervoLabel.get(document.querySelector('[data-component]')).update({onMouseDown:(event)=>window.events.push(event.detail)}));
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(20);
}
test.describe.configure({mode:'parallel'});
for(const dark of [false,true])for(const disabled of [false,true])for(const width of [375,1024]){
  test(`label reference ${dark} ${disabled} ${width}`,async({browser})=>{
    const context=await browser.newContext({viewport:{width,height:300}});const original=await context.newPage();const native=await context.newPage();
    await scene(original,true,{htmlFor:'field'},dark,disabled);await scene(native,false,{htmlFor:'field'},dark,disabled);
    const expected=PNG.sync.read(await original.screenshot());const actual=PNG.sync.read(await native.screenshot());
    expect(pixelmatch(expected.data,actual.data,null,width,300,{threshold:.05})).toBe(0);
    for(const page of [original,native]){await page.locator('label').click({force:disabled});if(!disabled)await expect(page.locator('#field')).toBeFocused();else await expect(page.locator('#field')).not.toBeFocused();}
    const style=(label)=>({font:getComputedStyle(label).fontSize,lineHeight:getComputedStyle(label).lineHeight,opacity:getComputedStyle(label).opacity,cursor:getComputedStyle(label).cursor});
    expect(await native.locator('label').evaluate(style)).toEqual(await original.locator('label').evaluate(style));await context.close();
  });
}
test('Radix double mousedown and interactive descendants match',async({browser})=>{
  const context=await browser.newContext();const original=await context.newPage();const native=await context.newPage();
  for(const [page,source]of[[original,true],[native,false]]){
    await scene(page,source,{htmlFor:'field'});
    const result=await page.locator('label').evaluate((label)=>{
      const one=label.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,detail:1}));
      const two=label.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,detail:2}));
      const input=document.createElement('input');label.append(input);const nested=input.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,detail:2}));return{one,two,nested};
    });expect(result).toEqual({one:true,two:false,nested:true});expect(await page.evaluate(()=>window.events)).toEqual([1,2]);
  }
  await context.close();
});
for(const children of [0,'0',false,true,'<script>&','First\nSecond'])test(`label children ${JSON.stringify(children)}`,async({browser})=>{
  const context=await browser.newContext();const original=await context.newPage();const native=await context.newPage();
  await scene(original,true,{children});await scene(native,false,{children});expect(await native.locator('label').textContent()).toBe(await original.locator('label').textContent());await context.close();
});
for(const tag of['span','button'])test(`asChild keeps the child tag and attribute precedence ${tag}`,async({browser})=>{
  const context=await browser.newContext();const original=await context.newPage();const native=await context.newPage();
  const options={asChild:true,tag,htmlFor:'field',title:'parent',attributes:{title:'parent',disabled:true},childAttributes:{title:'child',disabled:false},childClassName:'child',children:'Child label'};
  await scene(original,true,options);await scene(native,false,options);
  for(const page of[original,native]){await expect(page.locator(tag)).toHaveAttribute('title','child');await expect(page.locator(tag)).toHaveAttribute('for','field');await expect(page.locator(tag)).toHaveClass(/child/);if(tag==='button')await expect(page.locator(tag)).toBeEnabled();}
  await native.evaluate(()=>{window.stale=document.querySelector('[data-component]');window.stale.remove();});
  await expect.poll(()=>native.evaluate(()=>window.MauticUI.AcervoLabel.get(window.stale)===undefined)).toBe(true);await context.close();
});

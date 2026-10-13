import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { render } from './render.mjs';
const reference=await build({entryPoints:['tests/reference/avatar.tsx'],bundle:true,write:false,format:'iife',jsx:'automatic',alias:{'@':resolve('tests/reference/src')},define:{'process.env.NODE_ENV':'"production"'}});
const theme=readFileSync('tests/reference/avatar.generated.css','utf8'),css=readFileSync('../css/99.acervo-avatar.css','utf8'),script=readFileSync('../js/99.acervo-avatar.js','utf8');const font=readFileSync('../css/fonts/acervo-manrope-400.ttf').toString('base64');
const image=new PNG({width:4,height:4});for(let index=0;index<image.data.length;index+=4){image.data[index]=120;image.data[index+1]=114;image.data[index+2]=48;image.data[index+3]=255;}const bytes=PNG.sync.write(image);
async function scene(page,original,options,dark=false){
 await page.route('https://avatar.test/**',async(route)=>{if(route.request().url().includes('slow'))await new Promise(resolve=>setTimeout(resolve,200));if(route.request().url().includes('error'))await route.fulfill({status:404,body:''});else await route.fulfill({status:200,contentType:'image/png',body:bytes});});
 await page.setContent(`<html class="${dark?'dark':''}"><style>${theme}@font-face{font-family:Manrope;src:url(data:font/ttf;base64,${font})}@font-face{font-family:"Acervo Manrope";src:url(data:font/ttf;base64,${font})}body{margin:0;padding:32px}#reference{display:contents}${original?'':css}</style><body>${original?'<div id="reference"></div>':render('acervo-avatar',options)}</body></html>`);
 await page.evaluate((options)=>{window.referenceOptions=options;window.statuses=[];document.addEventListener('mautic:avatar:loading-status',(event)=>window.statuses.push(event.detail.status));},options);await page.addScriptTag({content:original?reference.outputFiles[0].text:script});await page.evaluate(()=>document.fonts.ready);
}
async function compare(original,native){const left=PNG.sync.read(await original.screenshot()),right=PNG.sync.read(await native.screenshot());expect(pixelmatch(left.data,right.data,null,left.width,left.height,{threshold:.05})).toBe(0);}
async function update(page,source,options){await page.evaluate(({source,options})=>{if(source)window.referenceUpdate(options);else window.MauticUI.AcervoAvatar.get(document.querySelector('[data-component]')).update(options);},{source,options});}
test.describe.configure({mode:'parallel'});
for(const dark of[false,true])for(const width of[375,1024])for(const src of[undefined,'https://avatar.test/image.png'])test(`avatar visual ${dark} ${width} ${src}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:200}});const original=await context.newPage(),native=await context.newPage();const options={src,alt:'Profile',children:'AB'};await scene(original,true,options,dark);await scene(native,false,options,dark);if(src)for(const page of[original,native])await expect(page.locator('img')).toHaveCount(1);await compare(original,native);expect(await native.evaluate(()=>window.statuses)).toEqual(await original.evaluate(()=>window.statuses));await context.close();
});
test('load error, replacement and stale request match Radix',async({browser})=>{
 const context=await browser.newContext();const original=await context.newPage(),native=await context.newPage();
 for(const[page,source]of[[original,true],[native,false]]){
  await scene(page,source,{src:'https://avatar.test/image.png',alt:'Profile',children:'AB'});await expect(page.locator('img')).toHaveCount(1);
  await update(page,source,{src:'https://avatar.test/error.png'});await expect(page.locator('img')).toHaveCount(0);await expect.poll(()=>page.evaluate(()=>window.statuses.at(-1))).toBe('error');
  await update(page,source,{src:'https://avatar.test/second.png',alt:'Changed'});await expect(page.locator('img')).toHaveAttribute('alt','Changed');
  await update(page,source,{src:undefined});await expect(page.locator('img')).toHaveCount(0);
 }
 expect(await native.evaluate(()=>window.statuses)).toEqual(await original.evaluate(()=>window.statuses));await compare(original,native);await context.close();
});
test('delay removal before timeout keeps original fallback eligibility',async({browser})=>{
 const context=await browser.newContext();const original=await context.newPage(),native=await context.newPage();
 for(const[page,source]of[[original,true],[native,false]]){await page.clock.install();await scene(page,source,{children:'AB',delayMs:200});}
 for(const[page,source]of[[original,true],[native,false]]){await expect(page.locator('body').getByText('AB',{exact:true})).toHaveCount(0);await update(page,source,{delayMs:undefined});}
 await original.clock.runFor(250);for(const page of[original,native])await expect(page.locator('body').getByText('AB',{exact:true})).toHaveCount(0);
 for(const[page,source]of[[original,true],[native,false]])await update(page,source,{delayMs:100});await original.clock.runFor(120);for(const page of[original,native])await expect(page.locator('body').getByText('AB',{exact:true})).toHaveCount(1);await compare(original,native);await context.close();
});
for(const children of[0,'0',false,true,'<script>&'])test(`avatar fallback ${JSON.stringify(children)}`,async({browser})=>{
 const context=await browser.newContext();const original=await context.newPage(),native=await context.newPage();await scene(original,true,{children});await scene(native,false,{children});expect(await native.locator('[data-slot=avatar-fallback]').textContent()).toBe(await original.locator('#reference>span>span').textContent());await context.close();
});
test('CORS policy attributes and disposal',async({browser})=>{
 const context=await browser.newContext();const native=await context.newPage();await scene(native,false,{children:'AB',src:'https://avatar.test/image.png',crossOrigin:'anonymous',referrerPolicy:'no-referrer'});
 await expect(native.locator('img')).toHaveAttribute('crossorigin','anonymous');await expect(native.locator('img')).toHaveAttribute('referrerpolicy','no-referrer');await native.evaluate(()=>{window.stale=document.querySelector('[data-component]');window.stale.remove();});await expect.poll(()=>native.evaluate(()=>window.MauticUI.AcervoAvatar.get(window.stale)===undefined)).toBe(true);await context.close();
});

test('asChild tags and child attribute precedence',async({browser})=>{
 const context=await browser.newContext();const original=await context.newPage(),native=await context.newPage();const options={asChild:true,childTag:'a',attributes:{title:'parent','aria-hidden':false,hidden:false},childAttributes:{title:'child',href:'#profile'},fallbackAsChild:true,fallbackChildTag:'em',fallbackAttributes:{title:'parent fallback'},fallbackChildAttributes:{title:'child fallback'},children:'AB'};
 await scene(original,true,options);await scene(native,false,options);await expect(native.locator('[data-slot=avatar]')).toHaveAttribute('title','child');await expect(native.locator('[data-slot=avatar]')).not.toHaveAttribute('hidden',/.*/);await expect(native.locator('[data-slot=avatar-fallback]')).toHaveAttribute('title','child fallback');await compare(original,native);await context.close();
});
test('image asChild DOM tag matches loaded source',async({browser})=>{
 const context=await browser.newContext();const original=await context.newPage(),native=await context.newPage();const options={src:'https://avatar.test/image.png',imageAsChild:true,imageChildTag:'span',children:'AB',alt:'Profile'};await scene(original,true,options);await scene(native,false,options);await expect(original.locator('#reference>span>span')).toHaveAttribute('src',options.src);await expect(native.locator('[data-slot=avatar-image]')).toHaveAttribute('src',options.src);await compare(original,native);for(const[page,source]of[[original,true],[native,false]]){await update(page,source,{alt:'Changed'});await expect(page.locator(source?'#reference>span>span':'[data-slot=avatar-image]')).toHaveAttribute('alt','Changed');await update(page,source,{alt:undefined});await expect(page.locator(source?'#reference>span>span':'[data-slot=avatar-image]')).not.toHaveAttribute('alt',/.*/);}await context.close();
});
test('late response cannot replace new error state',async({browser})=>{
 const context=await browser.newContext();const original=await context.newPage(),native=await context.newPage();
 for(const[page,source]of[[original,true],[native,false]]){await scene(page,source,{children:'AB'});await update(page,source,{src:'https://avatar.test/slow.png'});await expect.poll(()=>page.evaluate(()=>window.statuses.at(-1))).toBe('loading');await update(page,source,{src:'https://avatar.test/error.png'});await expect.poll(()=>page.evaluate(()=>window.statuses.at(-1))).toBe('error');await page.waitForTimeout(250);await expect(page.locator('img')).toHaveCount(0);}
 expect(await native.evaluate(()=>window.statuses)).toEqual(await original.evaluate(()=>window.statuses));await compare(original,native);await context.close();
});

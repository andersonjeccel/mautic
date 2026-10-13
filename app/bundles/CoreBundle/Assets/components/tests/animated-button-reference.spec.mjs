import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { render } from './render.mjs';

const autoload = process.env.MAUTIC_VENDOR_AUTOLOAD ?? resolve('../../../../../vendor/autoload.php');
const php = String.raw`require $argv[1]; $minifier = str_ends_with($argv[2], '.js') ? new \MatthiasMullie\Minify\JS($argv[2]) : new \MatthiasMullie\Minify\CSS($argv[2]); echo $minifier->minify();`;
const css = execFileSync('php', ['-r', php, autoload, resolve('../css/99.animated-button.css')], { encoding: 'utf8' });
const script = execFileSync('php', ['-r', php, autoload, resolve('../js/99.animated-button.js')], { encoding: 'utf8' });
const reference = await build({ entryPoints: ['tests/reference/animated-button.tsx'], bundle: true, write: false, format: 'iife', jsx: 'automatic', alias: { '@': resolve('tests/reference/src') }, define: { 'process.env.NODE_ENV': '"production"' } });
const theme = readFileSync('tests/reference/animated-button.generated.css', 'utf8');
const font = readFileSync('../css/fonts/acervo-manrope-400.ttf').toString('base64');
const common = `${theme}@font-face{font-family:Manrope;src:url(data:font/ttf;base64,${font})}@font-face{font-family:"Acervo Manrope";src:url(data:font/ttf;base64,${font})}body{display:flex;align-items:flex-start;margin:0;padding:64px}#reference{display:contents}`;
test.describe.configure({ mode: 'parallel' });
const instant = Date.UTC(2024, 0, 1);

async function scene(page, original, options, dark = false, fakeCapture = true, synchronized = true) {
  await page.evaluate(({ fakeCapture, synchronized }) => {
    if (!synchronized) return;
    const originalAnimate = Element.prototype.animate;
    window.animationStarts = new WeakMap();
    Element.prototype.animate = function (...argumentsList) {
      const animation = originalAnimate.apply(this, argumentsList);
      let origin = performance.now();
      window.animationStarts.set(animation, origin);
      Object.defineProperty(animation, 'startTime', { get: () => origin, set: (value) => { origin = value ?? performance.now(); window.animationStarts.set(animation, origin); animation.pause(); animation.currentTime = performance.now() - origin; } });
      animation.pause();
      return animation;
    };
    if (fakeCapture) {
      const captured = new Set();
      Element.prototype.setPointerCapture = (id) => captured.add(id);
      Element.prototype.hasPointerCapture = (id) => captured.has(id);
      Element.prototype.releasePointerCapture = (id) => captured.delete(id);
    }
  }, { fakeCapture, synchronized });
  await page.setContent(`<html class="${dark ? 'dark' : ''}"><head><style>${common}${original ? '' : css}</style></head><body>${original ? '<div id="reference"></div>' : render('animated-button', options)}</body></html>`);
  await page.evaluate(({ options, dark }) => { window.referenceOptions = options; document.documentElement.classList.toggle('dark', dark); window.changes = []; }, { options, dark });
  await page.addScriptTag({ content: original ? reference.outputFiles[0].text : script });
  
  await page.evaluate(() => document.fonts.ready);
}

async function sample(page){return page.locator('[data-component],#reference>*').evaluate(async(element)=>{
 const animations=document.getAnimations();for(const animation of animations){if(!window.animationStarts.has(animation))window.animationStarts.set(animation,animation instanceof CSSTransition?window.interactionTime:animation.startTime);animation.pause();animation.currentTime=performance.now()-window.animationStarts.get(animation);await animation.ready;}
 const style=getComputedStyle(element);return{bounds:element.getBoundingClientRect().toJSON(),scale:style.transform==='none'?1:new DOMMatrix(style.transform).a,color:style.color,background:style.backgroundColor,border:style.borderColor,shadow:style.boxShadow};
});}
async function compare(original,native,info,label){const expected=await sample(original),actual=await sample(native);
 for(const key of['color','background','border','shadow'])expect(actual[key],label).toBe(expected[key]);expect(actual.scale,label).toBeCloseTo(expected.scale,4);for(const key of['x','y','width','height'])expect(actual.bounds[key],label).toBeCloseTo(expected.bounds[key],4);
 const clip={x:32,y:32,width:160,height:112};const first=await original.screenshot({clip}),second=await native.screenshot({clip});const left=PNG.sync.read(first),right=PNG.sync.read(second);const pixels=pixelmatch(left.data,right.data,null,left.width,left.height,{threshold:.05});if(pixels){writeFileSync(info.outputPath('react.png'),first);writeFileSync(info.outputPath('twig.png'),second);}expect(pixels,label).toBe(0);return{label,expected,actual};
}
test('all styled variants and sizes match original',async({browser},info)=>{
 test.setTimeout(120000);const context=await browser.newContext();const original=await context.newPage(),native=await context.newPage();
 const cases=[];
 for(const dark of[false,true])for(const variant of['default','accent','destructive','outline','secondary','ghost','link'])for(const size of['default','sm','lg','icon','icon-sm','icon-lg']){
  await original.mouse.move(0,0);await native.mouse.move(0,0);
  const options={variant,size,children:'B',hoverScale:1,tapScale:1};await scene(original,true,options,dark,false,false);await scene(native,false,options,dark,false,false);cases.push(await compare(original,native,info,`${dark} ${variant} ${size}`));
  if(size==='default'){
   for(const page of[original,native]){await page.locator('[data-component],#reference>*').hover();await page.waitForTimeout(200);}cases.push(await compare(original,native,info,`${dark} ${variant} hover`));
   for(const page of[original,native]){await page.mouse.move(0,0);await page.keyboard.press('Tab');await page.locator('[data-component],#reference>*').focus();await page.waitForTimeout(200);}cases.push(await compare(original,native,info,`${dark} ${variant} focus`));
  }
 }
 writeFileSync(info.outputPath('variants.json'),JSON.stringify(cases,null,2));await context.close();
});
for(const dark of[false,true])for(const reducedMotion of['no-preference','reduce'])for(const scales of[[1.05,.95],[1.2,.8],[0,0]])test(`spring ${dark} ${reducedMotion} ${scales}`,async({browser},info)=>{
 test.setTimeout(120000);const context=await browser.newContext({reducedMotion});const original=await context.newPage(),native=await context.newPage();await original.clock.install({time:new Date(instant)});
 const options={children:'B',hoverScale:scales[0],tapScale:scales[1]};await scene(original,true,options,dark);await scene(native,false,options,dark);await original.clock.pauseAt(new Date(instant+1000));await original.clock.runFor(1000);const evidence=[];
 for(const action of['initial','hover','down','leave','up','hover','retarget','cancel','leave']){
  for(const[page,source]of[[original,true],[native,false]]){
   await page.evaluate(()=>{window.interactionTime=performance.now();});
   if(action==='hover')await page.mouse.move(82,82);
   if(action==='leave')await page.mouse.move(0,0);
   if(action==='down'||action==='up'||action==='cancel')await page.evaluate((action)=>{const element=document.querySelector('[data-component],#reference>*');element.dispatchEvent(new PointerEvent(action==='down'?'pointerdown':action==='up'?'pointerup':'pointercancel',{bubbles:true,isPrimary:true,pointerType:'mouse',button:0}));},action);
   if(action==='retarget')await page.evaluate((source)=>{if(source)window.referenceUpdate({hoverScale:1.1});else window.MauticUI.AnimatedButton.get(document.querySelector('[data-component]')).update({hoverScale:1.1});},source);
  }
  for(const elapsed of[16,16,32,64,128]){await original.clock.runFor(elapsed);evidence.push(await compare(original,native,info,`${action} ${elapsed}`));}
 }
 writeFileSync(info.outputPath('trajectories.json'),JSON.stringify(evidence,null,2));await context.close();
});
test('primitive, parent-priority Slot and real pointer lifecycle',async({browser},info)=>{
 const context=await browser.newContext();const original=await context.newPage(),native=await context.newPage();
 const options={primitive:true,asChild:true,tag:'a',children:'B',attributes:{title:'parent',href:'#parent'},childAttributes:{title:'child',href:'#child'},childClassName:'child'};
 for(const[page,source]of[[original,true],[native,false]]){await scene(page,source,options,false,false,false);await expect(page.locator('a')).toHaveAttribute('title','parent');await expect(page.locator('a')).toHaveAttribute('href','#parent');await page.locator('a').hover();await expect.poll(()=>page.locator('a').evaluate((element)=>new DOMMatrix(getComputedStyle(element).transform).a)).toBeGreaterThan(1);await page.mouse.down();await expect.poll(()=>page.locator('a').evaluate((element)=>new DOMMatrix(getComputedStyle(element).transform).a)).toBeLessThan(1);await page.mouse.up();}
 await native.evaluate(()=>{window.stale=document.querySelector('[data-component]');window.stale.remove();});await expect.poll(()=>native.evaluate(()=>window.MauticUI.AnimatedButton.get(window.stale)===undefined)).toBe(true);await context.close();
});

test('parent Slot disabled wins, keyboard and form semantics',async({browser})=>{
 const context=await browser.newContext();const original=await context.newPage(),native=await context.newPage();
 for(const[page,source]of[[original,true],[native,false]]){
  await scene(page,source,{asChild:true,tag:'button',disabled:true,childAttributes:{disabled:false},children:'B'},false,false,false);await expect(page.locator('button')).toBeDisabled();
  if(source)await page.evaluate(()=>window.referenceUpdate({disabled:false}));else await page.evaluate(()=>window.MauticUI.AnimatedButton.get(document.querySelector('[data-component]')).update({disabled:false}));
  await expect(page.locator('button')).toBeEnabled();await page.keyboard.press('Tab');await page.keyboard.down('Enter');await expect.poll(()=>page.locator('button').evaluate((element)=>new DOMMatrix(getComputedStyle(element).transform).a)).toBeLessThan(1);await page.keyboard.up('Enter');
  await page.evaluate(()=>{const button=document.querySelector('button');button.setAttribute('name','action');button.setAttribute('value','0');const form=document.createElement('form');button.parentNode.insertBefore(form,button);form.append(button);window.submissions=[];form.addEventListener('submit',(event)=>{event.preventDefault();window.submissions.push([...new FormData(form,event.submitter)]);});});
  await page.locator('button').click();expect(await page.evaluate(()=>window.submissions)).toEqual([[['action','0']]]);
 }
 await context.close();
});

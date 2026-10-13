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
const css = execFileSync('php', ['-r', php, autoload, resolve('../css/99.animated-toggle.css')], { encoding: 'utf8' });
const script = execFileSync('php', ['-r', php, autoload, resolve('../js/99.animated-toggle.js')], { encoding: 'utf8' });
const reference = await build({ entryPoints: ['tests/reference/toggle.tsx'], bundle: true, write: false, format: 'iife', jsx: 'automatic', alias: { '@': resolve('tests/reference/src') }, define: { 'process.env.NODE_ENV': '"production"' } });
const theme = readFileSync('tests/reference/toggle.generated.css', 'utf8');
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
  await page.setContent(`<html class="${dark ? 'dark' : ''}"><head><style>${common}${original ? '' : css}</style></head><body>${original ? '<div id="reference"></div>' : render(options.primitive?'animated-toggle-root':'animated-toggle', options)}</body></html>`);
  await page.evaluate(({ options, dark }) => { window.referenceOptions = options; document.documentElement.classList.toggle('dark', dark); window.changes = []; }, { options, dark });
  await page.addScriptTag({ content: original ? reference.outputFiles[0].text : script });
  if (!original) await page.evaluate(() => window.MauticUI.AnimatedToggle.get(document.querySelector('[data-component]')).update({ onPressedChange: (checked) => window.changes.push(checked) }));
  await page.evaluate(() => document.fonts.ready);
}

async function action(page, original, step) {
  await page.evaluate(({ original, step }) => {
    const button = document.querySelector('button');
    window.interactionTime = performance.now();
    if (step.update) {
      if (original) window.referenceUpdate(step.update);
      else window.MauticUI.AnimatedToggle.get(button).update(step.update);
    }
    if (step.context !== undefined) {
      if (original) window.referenceContext.setIsPressed(step.context);
      else window.MauticUI.AnimatedToggle.get(button).getContext().setIsPressed(step.context);
    }
    if (step.pointer) button.dispatchEvent(new PointerEvent(step.pointer, { bubbles:true, isPrimary:true, pointerType:step.touch?'touch':'mouse',button:step.secondary?2:0 }));
    if (step.outside) window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,isPrimary:true}));
    if (step.click) button.querySelector('[data-slot="toggle-item"]').click();
  }, { original,step });
  if(step.hover!==undefined)await page.mouse.move(step.hover?82:0,step.hover?82:0);
}

async function frame(page) {
  return page.locator('button').evaluate(async (button) => {
    const item=button.querySelector('[data-slot="toggle-item"]');
    const animations=document.getAnimations();
    for (const animation of animations) {
      if (!window.animationStarts.has(animation)) window.animationStarts.set(animation, animation instanceof CSSTransition?window.interactionTime:animation.startTime);
      animation.pause(); animation.currentTime=performance.now()-window.animationStarts.get(animation);
    }
    await Promise.all(animations.map((animation)=>animation.ready));
    const style=getComputedStyle(item); const transform=getComputedStyle(button).transform;
    const highlight=button.querySelector('[data-slot="toggle-highlight"]');
    return { root:button.getAttribute('aria-pressed'),item:item.getAttribute('aria-pressed'),state:item.dataset.state,disabled:item.dataset.disabled??null,
      bounds:button.getBoundingClientRect().toJSON(), scale:transform==='none'?1:new DOMMatrix(transform).a,
      opacity:highlight?Number(getComputedStyle(highlight).opacity):null,
      color:style.color,background:style.backgroundColor,border:style.borderColor,
      changes:window.changes };
  });
}

test('toggle production dependency graph excludes React',async()=>{
  const graph=await build({entryPoints:['src/animated-toggle.ts'],bundle:true,write:false,metafile:true});
  expect(Object.keys(graph.metafile.inputs).filter((name)=>/node_modules\/(react|react-dom)\//.test(name))).toEqual([]);
});

for (const controlled of [false,true]) {
  test(`root and context controlled behavior ${controlled}`,async({browser})=>{
    const context=await browser.newContext(); const original=await context.newPage(); const native=await context.newPage();
    const options={children:'B',...(controlled?{pressed:false}:{defaultPressed:false})};
    await scene(original,true,options,false,false,false);await scene(native,false,options,false,false,false);
    for (const step of [{click:true},{click:true},{update:{pressed:false}},{update:{pressed:true}},{context:false},{update:{pressed:true}},{update:{pressed:undefined}},{click:true},{update:{disabled:true}},{click:true}]) {
      for (const [page,source] of [[original,true],[native,false]]) await action(page,source,step);
      const state=(button)=>({root:button.getAttribute('aria-pressed'),item:button.querySelector('[data-slot="toggle-item"]').getAttribute('aria-pressed'),changes:window.changes});
      expect(await native.locator('button').evaluate(state)).toEqual(await original.locator('button').evaluate(state));
    }
    await context.close();
  });
}

for (const dark of [false,true]) for (const reducedMotion of ['no-preference','reduce']) for (const variant of ['default','outline']) for (const size of ['default','sm','lg','icon']) {
  test(`React toggle ${dark?'dark':'light'} ${reducedMotion} ${variant} ${size}`,async({browser},info)=>{
    test.setTimeout(120000);
    const context=await browser.newContext({reducedMotion}); const original=await context.newPage();const native=await context.newPage();
    await original.clock.install({time:new Date(instant)});
    const options={pressed:false,size,variant,children:'B'};
    await scene(original,true,options,dark);await scene(native,false,options,dark);
    await original.clock.pauseAt(new Date(instant+1000));await original.clock.runFor(1000);
    const evidence=[];
    const steps=[{}, {hover:true}, {hover:false}, {pointer:'pointerdown',frames:[16,32]}, {outside:true}, {click:true}, {click:true}, {update:{pressed:false}},
      {update:{pressed:true},frames:[16,32]},{update:{pressed:false},frames:[16,32]},{update:{pressed:true}},
      {update:{disabled:true}}, {click:true},{update:{disabled:false}}, {context:false}, {context:true}, {update:{pressed:undefined}}, {click:true}];
    for (const [index,step] of steps.entries()) {
      await action(original,true,step);await action(native,false,step);
      for (const elapsed of step.frames??[16,32,64,128,256]) {
        await original.clock.runFor(elapsed);
        const expected=await frame(original);const actual=await frame(native);evidence.push({index,elapsed,expected,actual});
        const message=`step ${index}: ${JSON.stringify({expected,actual})}`;
        for (const key of ['root','item','state','disabled','color','background','border']) expect(actual[key],message).toBe(expected[key]);
        expect(actual.changes,message).toEqual(expected.changes);expect(actual.scale,message).toBeCloseTo(expected.scale,4);
        for (const coordinate of ['x','y','width','height']) expect(actual.bounds[coordinate],message).toBeCloseTo(expected.bounds[coordinate],4);
        if(expected.opacity===null)expect(actual.opacity,message).toBeNull();else expect(actual.opacity,message).toBeCloseTo(expected.opacity,4);
        const clip={x:48,y:48,width:80,height:80};const first=await original.screenshot({clip});const second=await native.screenshot({clip});
        const left=PNG.sync.read(first);const right=PNG.sync.read(second);const difference=pixelmatch(left.data,right.data,null,left.width,left.height,{threshold:.05});
        if(difference){writeFileSync(info.outputPath(`${index}-react.png`),first);writeFileSync(info.outputPath(`${index}-twig.png`),second);}
        expect(difference,message).toBe(0);
      }
    }
    writeFileSync(info.outputPath('trajectories.json'),JSON.stringify(evidence,null,2));await context.close();
  });
}

test('real pointer, keyboard, exit lifecycle and native forms match React',async({browser})=>{
  const context=await browser.newContext(); const original=await context.newPage(); const native=await context.newPage();
  await scene(original,true,{children:'B'},false,false,false);await scene(native,false,{children:'B'},false,false,false);
  for(const page of [original,native]){
    await expect(page.locator('[data-slot="toggle-item"]')).not.toHaveAttribute('aria-pressed',/.*/);
    await page.keyboard.press('Tab');await expect(page.locator('button')).toBeFocused();
    await page.keyboard.down('Space');expect(await page.locator('button').evaluate((button)=>new DOMMatrix(getComputedStyle(button).transform).a)).toBe(1);
    await page.keyboard.up('Space');await expect(page.locator('button')).toHaveAttribute('aria-pressed','true');
    await page.keyboard.press('Enter');await expect(page.locator('button')).toHaveAttribute('aria-pressed','false');
    await expect(page.locator('[data-slot="toggle-highlight"]')).toHaveCount(0);
    await page.locator('button').hover();await page.mouse.down();await expect.poll(()=>page.locator('button').evaluate((button)=>new DOMMatrix(getComputedStyle(button).transform).a)).toBeLessThan(1);
    await page.mouse.up();await expect(page.locator('button')).toHaveAttribute('aria-pressed','true');
    await page.evaluate(()=>{const form=document.createElement('form');form.append(document.querySelector('button'));document.body.append(form);window.entries=[...new FormData(form)];});
    expect(await page.evaluate(()=>window.entries)).toEqual([]);
    await action(page,page===original,{update:{disabled:true}});await expect(page.locator('button')).toBeDisabled();
  }
  expect(await native.evaluate(()=>window.changes)).toEqual(await original.evaluate(()=>window.changes));
  await native.evaluate(()=>{window.staleButton=document.querySelector('button');window.staleButton.remove();});
  await expect.poll(()=>native.evaluate(()=>window.MauticUI.AnimatedToggle.get(window.staleButton)===undefined)).toBe(true);
  const before=await native.evaluate(()=>window.changes.length);
  await native.evaluate(()=>{window.staleButton.disabled=false;window.staleButton.click();});
  expect(await native.evaluate(()=>window.changes.length)).toBe(before);await context.close();
});

for(const options of [{pressed:true},{defaultPressed:true},{pressed:null},{size:null,variant:null},{size:'icon',variant:'outline',tabIndex:0,'aria-invalid':true}]){
  test(`initial values and attributes ${JSON.stringify(options)}`,async({browser})=>{
    const context=await browser.newContext();const original=await context.newPage();const native=await context.newPage();
    const normalized={...options,children:'B',...(options.tabIndex===0?{attributes:{tabindex:0,'aria-invalid':true}}:{})};
    await scene(original,true,options,false,false,false);await scene(native,false,normalized,false,false,false);
    await original.waitForTimeout(400);await native.waitForTimeout(50);
    const snapshot=(button)=>{const item=button.querySelector('[data-slot="toggle-item"]');const style=getComputedStyle(item);return{root:button.getAttribute('aria-pressed'),item:item.getAttribute('aria-pressed'),bounds:[button.offsetWidth,button.offsetHeight],border:style.borderColor,shadow:style.boxShadow,highlight:!!button.querySelector('[data-slot="toggle-highlight"]')};};
    expect(await native.locator('button').evaluate(snapshot)).toEqual(await original.locator('button').evaluate(snapshot));
    if(options.tabIndex===0){for(const page of [original,native]){await page.locator('[data-slot="toggle-item"]').focus();await page.waitForTimeout(250);}expect(await native.locator('button').evaluate(snapshot)).toEqual(await original.locator('button').evaluate(snapshot));}
    await context.close();
  });
}

for(const itemEnabled of [false,true]){
  test(`primitive root and slots ${itemEnabled}`,async({browser})=>{
    const context=await browser.newContext();const original=await context.newPage();const native=await context.newPage();
    const options={primitive:true,itemEnabled,children:'B'};
    await scene(original,true,options,false,false,false);await scene(native,false,options,false,false,false);
    const state=(button)=>({root:button.getAttribute('aria-pressed'),context:window.referenceContext?.isPressed??window.MauticUI?.AnimatedToggle.get(button).getContext().isPressed,
      bounds:[button.offsetWidth,button.offsetHeight],position:getComputedStyle(button).position,items:button.querySelectorAll('[data-slot="toggle-item"]').length,highlight:button.querySelectorAll('[data-slot="toggle-highlight"]').length,changes:window.changes});
    expect(await native.locator('button').evaluate(state)).toEqual(await original.locator('button').evaluate(state));
    for(const page of [original,native])await page.locator('button').click();
    expect(await native.locator('button').evaluate(state)).toEqual(await original.locator('button').evaluate(state));
    for(const page of [original,native])await action(page,page===original,{context:false});
    for(const page of [original,native])await expect(page.locator('[data-slot="toggle-highlight"]')).toHaveCount(0);
    expect(await native.locator('button').evaluate(state)).toEqual(await original.locator('button').evaluate(state));await context.close();
  });
}

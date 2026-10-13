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
const css = execFileSync('php', ['-r', php, autoload, resolve('../css/99.task-checkbox.css')], { encoding: 'utf8' });
const script = execFileSync('php', ['-r', php, autoload, resolve('../js/99.task-checkbox.js')], { encoding: 'utf8' });
const reference = await build({ entryPoints: ['tests/reference/task.tsx'], bundle: true, write: false, format: 'iife', jsx: 'automatic', alias: { '@': resolve('tests/reference/src') }, define: { 'process.env.NODE_ENV': '"production"' } });
const theme = readFileSync('tests/reference/task.generated.css', 'utf8');
const font = readFileSync('../css/fonts/acervo-manrope-400.ttf').toString('base64');
const common = `${theme}@font-face{font-family:Manrope;src:url(data:font/ttf;base64,${font})}@font-face{font-family:"Acervo Manrope";src:url(data:font/ttf;base64,${font})}body{display:flex;margin:0;padding:64px}#reference{display:contents}`;
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
  await page.setContent(`<html class="${dark ? 'dark' : ''}"><head><style>${common}${original ? '' : css}</style></head><body>${original ? '<div id="reference"></div>' : render('task-checkbox', options)}</body></html>`);
  await page.evaluate(({ options, dark }) => { window.referenceOptions = options; document.documentElement.classList.toggle('dark', dark); window.changes = []; }, { options, dark });
  await page.addScriptTag({ content: original ? reference.outputFiles[0].text : script });
  if (!original) await page.evaluate(() => window.MauticUI.TaskCheckbox.get(document.querySelector('[data-component]')).update({ onCheckedChange: (checked) => window.changes.push(checked) }));
  await page.evaluate(() => document.fonts.ready);
}

async function action(page, original, step) {
  await page.evaluate(({ original, step }) => {
    const button = document.querySelector('[role="checkbox"]');
    const row = button.parentElement;
    getComputedStyle(button.querySelector('span')).borderColor;
    window.interactionTime = performance.now();
    if (step.update) {
      if (original) window.referenceUpdate(step.update);
      else window.MauticUI.TaskCheckbox.get(row).update(step.update);
    }
    if (step.pointer) button.dispatchEvent(new PointerEvent(step.pointer, { bubbles: true, pointerType: step.touch ? 'touch' : 'mouse', isPrimary: true, button: 0 }));
    if (step.outside) window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, isPrimary: true }));
    if (step.click) (step.text ? row.querySelector(':scope > div') : button).click();
  }, { original, step });
}

async function frame(page) {
  return page.getByRole('checkbox').evaluate(async (button) => {
    const row = button.parentElement;
    const box = button.querySelector(':scope > span');
    const fill = box.querySelector(':scope > span');
    const label = row.querySelector(':scope > div > span');
    const strike = label.querySelector('span[aria-hidden]');
    const path = box.querySelector('path');
    getComputedStyle(box).borderColor;
    getComputedStyle(label).color;
    const animations = document.getAnimations();
    for (const animation of animations) {
      if (!window.animationStarts.has(animation)) window.animationStarts.set(animation, animation instanceof CSSTransition ? window.interactionTime : animation.startTime);
      animation.pause(); animation.currentTime = performance.now() - window.animationStarts.get(animation);
    }
    await Promise.all(animations.map((animation) => animation.ready));
    const state = (element) => {
      const style = getComputedStyle(element);
      const matrix = style.transform === 'none' ? new DOMMatrix() : new DOMMatrix(style.transform);
      return { bounds: element.getBoundingClientRect().toJSON(), matrix: [matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f], opacity: Number(style.opacity) };
    };
    return {
      checked: button.getAttribute('aria-checked'), changes: window.changes,
      button: state(button), box: state(box), fill: state(fill), strike: state(strike),
      border: getComputedStyle(box).borderColor, color: getComputedStyle(label).color,
      strokeOpacity: Number(getComputedStyle(path).opacity), length: Number.parseFloat(path.getAttribute('stroke-dasharray')),
      particles: [...box.querySelectorAll(':scope > span[aria-hidden] > span')].map(state)
    };
  });
}

test('task production dependency graph excludes React', async () => {
  const graph = await build({ entryPoints: ['src/task-checkbox.ts'], bundle: true, write: false, metafile: true });
  expect(Object.keys(graph.metafile.inputs).filter((name) => /node_modules\/(react|react-dom)\//.test(name))).toEqual([]);
});

for (const controlled of [false, true]) {
  test(`real task text, mouse and keyboard ${controlled ? 'controlled' : 'uncontrolled'}`, async ({ browser }) => {
    const context = await browser.newContext();
    const original = await context.newPage(); const native = await context.newPage();
    const options = { label: 'Review task', description: 'Details', ...(controlled ? { checked: false } : { defaultChecked: false }) };
    for (const [page, source] of [[original,true],[native,false]]) {
      await scene(page,source,options,false,false,false);
      await page.getByRole('checkbox').click();
      await expect.poll(() => page.getByRole('checkbox').locator(':scope > span > span[aria-hidden] > span').count()).toBe(0);
      await page.getByRole('checkbox').evaluate((button) => button.parentElement.querySelector(':scope > div').click());
      await page.getByRole('checkbox').press('Enter');
      await page.getByRole('checkbox').press('Space');
      await action(page,source,{update:{disabled:true}});
      await page.getByRole('checkbox').evaluate((button) => button.parentElement.querySelector(':scope > div').click());
    }
    expect(await native.evaluate(() => window.changes)).toEqual(await original.evaluate(() => window.changes));
    expect(await native.getByRole('checkbox').getAttribute('aria-checked')).toBe(await original.getByRole('checkbox').getAttribute('aria-checked'));
    await native.evaluate(() => { window.removed=document.querySelector('[data-component]'); window.removed.remove(); });
    await expect.poll(() => native.evaluate(() => window.MauticUI.TaskCheckbox.get(window.removed)===undefined)).toBe(true);
    await context.close();
  });
}

test('task null, release and initial positive state follow the original API', async ({ browser }) => {
  const context=await browser.newContext(); const original=await context.newPage(); const native=await context.newPage();
  await scene(original,true,{label:'Task',checked:true,defaultChecked:false},false,false,false);
  await scene(native,false,{label:'Task',checked:true,defaultChecked:false},false,false,false);
  for (const update of [{checked:undefined},{checked:null},{checked:false},{checked:undefined},{defaultChecked:true}]) {
    for (const [page,source] of [[original,true],[native,false]]) {
      await action(page,source,{update}); await page.getByRole('checkbox').evaluate((button)=>button.click());
    }
    expect(await native.evaluate(()=>window.changes)).toEqual(await original.evaluate(()=>window.changes));
    expect(await native.getByRole('checkbox').getAttribute('aria-checked')).toBe(await original.getByRole('checkbox').getAttribute('aria-checked'));
  }
  await context.close();
});

test('task text zero, empty and boolean values preserve original layout and ARIA', async ({ browser }) => {
  const context=await browser.newContext(); const original=await context.newPage(); const native=await context.newPage();
  for (const [label,description] of [[0,0],['Task','0'],[false,false],['',''],['Task',true],['Task','<script>text']]) {
    await scene(original,true,{label,description},false,false,false); await scene(native,false,{label,description},false,false,false);
    const state=(button)=>{const root=button.parentElement;return {text:root.textContent.trim(),description:button.hasAttribute('aria-describedby'),bounds:root.getBoundingClientRect().toJSON()};};
    expect(await native.getByRole('checkbox').evaluate(state)).toEqual(await original.getByRole('checkbox').evaluate(state));
    expect(await native.locator('script[src]').count()).toBe(0);
  }
  await context.close();
});

for (const dark of [false, true]) for (const reducedMotion of ['no-preference', 'reduce']) for (const size of ['sm', 'md', 'lg']) {
  test(`React task trajectory ${dark ? 'dark' : 'light'} ${reducedMotion} ${size}`, async ({ browser }, info) => {
    test.setTimeout(120000);
    const context = await browser.newContext({ reducedMotion });
    const original = await context.newPage();
    const native = await context.newPage();
    await original.clock.install({ time: new Date(instant) });
    const options = { checked: false, label: 'Review task', description: 'Task details', size };
    await scene(original, true, options, dark);
    await scene(native, false, options, dark);
    await original.clock.pauseAt(new Date(instant + 1000));
    await original.clock.runFor(1000);
    const steps = [{}, { pointer: 'pointerdown', frames: [16,32] }, { outside: true },
      { update: { checked: true }, frames: [16,16,32,16,64,128,256] }, { update: { checked: false }, frames: [16,32] }, { update: { checked: true }, frames: [16,32] }, { update: { checked: false } },
      { click: true }, { click: true, text: true, frames: [16,32,64] }, { update: { size: size === 'lg' ? 'sm' : 'lg' }, frames: [16,32,64] }, { update: { size }, frames: [16,32,64] }, { update: { checked: true } }, { click: true },
      { update: { checked: false } }, { click: true, frames: [16,32,64,128,128,128,256] }, { update: { disabled: true } }, { click: true, text: true }, { update: { disabled: false } },
      { update: { label: 'Changed task', description: '' } }, { update: { description: '0' } }
    ];
    const evidence = [];
    for (const [index, step] of steps.entries()) {
      await action(original, true, step); await action(native, false, step);
      for (const elapsed of step.frames ?? [16,32,64,128,256]) {
        await original.clock.runFor(elapsed);
        const expected = await frame(original); const actual = await frame(native);
        evidence.push({ index, elapsed, expected, actual });
        const message = `step ${index}: ${JSON.stringify({expected,actual})}`;
        expect(actual.checked, message).toBe(expected.checked); expect(actual.changes, message).toEqual(expected.changes);
        expect(actual.border, message).toBe(expected.border); expect(actual.color, message).toBe(expected.color);
        for (const key of ['button','box','fill','strike']) {
          for (const coordinate of ['x','y','width','height']) expect(actual[key].bounds[coordinate], message).toBeCloseTo(expected[key].bounds[coordinate],4);
          for (const [position,value] of expected[key].matrix.entries()) expect(actual[key].matrix[position],message).toBeCloseTo(value,4);
        }
        expect(actual.strokeOpacity, message).toBeCloseTo(expected.strokeOpacity,4); expect(actual.length,message).toBeCloseTo(expected.length,4);
        expect(actual.particles.length,message).toBe(expected.particles.length);
        for (const [position,particle] of expected.particles.entries()) {
          expect(actual.particles[position].opacity,message).toBeCloseTo(particle.opacity,4);
          for (const [coordinate,value] of particle.matrix.entries()) expect(actual.particles[position].matrix[coordinate],message).toBeCloseTo(value,4);
        }
        const clip = { x: 16, y: 16, width: 240, height: 112 };
        const first = await original.screenshot({clip}); const second = await native.screenshot({clip});
        const left = PNG.sync.read(first); const right = PNG.sync.read(second);
        const difference = pixelmatch(left.data,right.data,null,left.width,left.height,{threshold:.05});
        if (difference) { writeFileSync(info.outputPath(`${index}-react.png`),first);writeFileSync(info.outputPath(`${index}-twig.png`),second); }
        expect(difference,message).toBe(0);
      }
    }
    writeFileSync(info.outputPath('trajectories.json'),JSON.stringify(evidence,null,2));
    await context.close();
  });
}

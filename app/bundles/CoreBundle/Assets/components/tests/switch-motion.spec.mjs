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
const css = execFileSync('php', ['-r', php, autoload, resolve('../css/99.animated-switch.css')], { encoding: 'utf8' });
const script = execFileSync('php', ['-r', php, autoload, resolve('../js/99.animated-switch.js')], { encoding: 'utf8' });
const reference = await build({ entryPoints: ['tests/reference/switch.tsx'], bundle: true, write: false, format: 'iife', jsx: 'automatic', alias: { '@': resolve('tests/reference/src') }, define: { 'process.env.NODE_ENV': '"production"' } });
const theme = readFileSync('tests/reference/switch.generated.css', 'utf8');
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
  await page.setContent(`<html class="${dark ? 'dark' : ''}"><head><style>${common}${original ? '' : css}</style></head><body>${original ? '<div id="reference"></div>' : render('animated-switch', options)}</body></html>`);
  await page.evaluate(({ options, dark }) => { window.referenceOptions = options; document.documentElement.classList.toggle('dark', dark); window.changes = []; }, { options, dark });
  await page.addScriptTag({ content: original ? reference.outputFiles[0].text : script });
  if (!original) await page.evaluate(() => window.MauticUI.AnimatedSwitch.get(document.querySelector('[data-component]')).update({ onCheckedChange: (checked) => window.changes.push(checked) }));
  await page.evaluate(() => document.fonts.ready);
}

async function action(page, original, step) {
  await page.evaluate(({ original, step }) => {
    const button = document.querySelector('[role="switch"]');
    getComputedStyle(button).backgroundColor;
    window.interactionTime = performance.now();
    if (step.update) {
      if (original) window.referenceUpdate(step.update);
      else {
        const update = { ...step.update };
        for (const key of ['onIcon', 'offIcon']) if (update[key] === 'fixture:svg') {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' })) svg.setAttribute(name, value);
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', 'M5 12h14M12 5v14');
          svg.append(path);
          update[key] = svg;
        }
        window.MauticUI.AnimatedSwitch.get(button).update(update);
      }
    }
    if (step.pointer) {
      const event = new PointerEvent(step.pointer, { bubbles: true, pointerType: step.touch ? 'touch' : 'mouse', pointerId: step.id ?? 1, isPrimary: step.primary ?? true, clientX: step.x ?? 64, clientY: 70, button: step.secondary ? 2 : 0 });
      Object.defineProperty(event, 'timeStamp', { value: performance.now() });
      button.dispatchEvent(event);
    }
    if (step.click) button.click();
  }, { original, step });
}

async function frame(page) {
  return page.getByRole('switch').evaluate(async (button) => {
    getComputedStyle(button).backgroundColor;
    const animations = document.getAnimations();
    for (const animation of animations) {
      if (!window.animationStarts.has(animation)) window.animationStarts.set(animation, animation instanceof CSSTransition ? window.interactionTime : animation.startTime);
      animation.pause();
      animation.currentTime = performance.now() - window.animationStarts.get(animation);
    }
    await Promise.all(animations.map((animation) => animation.ready));
    const knob = button.querySelectorAll(':scope > span')[1];
    return {
      checked: button.getAttribute('aria-checked'), background: getComputedStyle(button).backgroundColor,
      bounds: knob.getBoundingClientRect().toJSON(),
      svgs: [...knob.querySelectorAll('svg')].map((svg) => svg.getBoundingClientRect().toJSON()),
      icons: [...knob.querySelectorAll('span > span')].map((icon) => {
        const style = getComputedStyle(icon);
        const matrix = style.transform === 'none' ? new DOMMatrix() : new DOMMatrix(style.transform);
        return { text: icon.textContent, opacity: Number(style.opacity), matrix: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f] };
      }),
      changes: window.changes
    };
  });
}

test('switch production dependency graph excludes React', async () => {
  const graph = await build({ entryPoints: ['src/animated-switch.ts'], bundle: true, write: false, metafile: true });
  expect(Object.keys(graph.metafile.inputs).filter((name) => /node_modules\/(react|react-dom)\//.test(name))).toEqual([]);
});

for (const controlled of [false, true]) {
  test(`real pointer and keyboard switch behavior ${controlled ? 'controlled' : 'uncontrolled'}`, async ({ browser }) => {
    const context = await browser.newContext();
    const original = await context.newPage();
    const native = await context.newPage();
    const options = controlled ? { checked: false } : { defaultChecked: true };
    await scene(original, true, options, false, false, false);
    await scene(native, false, options, false, false, false);
    for (const page of [original, native]) {
      await page.getByRole('switch').click();
      await page.getByRole('switch').press('Enter');
      await page.getByRole('switch').press('Space');
      const box = await page.getByRole('switch').boundingBox();
      await page.mouse.move(box.x + 4, box.y + 12);
      await page.mouse.down();
      await page.mouse.move(box.x + 28, box.y + 12, { steps: 5 });
      await page.waitForTimeout(120);
      await page.mouse.up();
    }
    expect(await native.getByRole('switch').getAttribute('aria-checked')).toBe(await original.getByRole('switch').getAttribute('aria-checked'));
    expect(await native.evaluate(() => window.changes)).toEqual(await original.evaluate(() => window.changes));
    await context.close();
  });
}

test('real icon exit completes, disabled blocks actions and AJAX cleanup removes the controller', async ({ browser }) => {
  const context = await browser.newContext();
  const original = await context.newPage();
  const native = await context.newPage();
  for (const [page, source] of [[original, true], [native, false]]) {
    await scene(page, source, { onIcon: '+', offIcon: '-' }, false, false, false);
    await page.getByRole('switch').click();
    await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    await expect.poll(() => page.getByRole('switch').locator('span > span').allTextContents()).toEqual(['+', '+']);
    await action(page, source, { update: { disabled: true } });
    await page.getByRole('switch').evaluate((button) => button.click());
  }
  expect(await native.evaluate(() => window.changes)).toEqual(await original.evaluate(() => window.changes));
  await native.evaluate(() => { window.removed = document.querySelector('[data-component]'); window.removed.remove(); });
  await expect.poll(() => native.evaluate(() => window.MauticUI.AnimatedSwitch.get(window.removed) === undefined)).toBe(true);
  await context.close();
});

test('controlled release, null and default state match the original API', async ({ browser }) => {
  const context = await browser.newContext();
  const original = await context.newPage();
  const native = await context.newPage();
  await scene(original, true, { checked: false, defaultChecked: true }, false, false, false);
  await scene(native, false, { checked: false, defaultChecked: true }, false, false, false);
  for (const update of [{ checked: true }, { checked: undefined }, { defaultChecked: false }, { checked: null }, { disabled: true }, { disabled: false, label: '' }]) {
    for (const [page, source] of [[original, true], [native, false]]) {
      await action(page, source, { update });
      await page.getByRole('switch').evaluate((button) => button.click());
    }
    expect(await native.getByRole('switch').getAttribute('aria-checked')).toBe(await original.getByRole('switch').getAttribute('aria-checked'));
    expect(await native.evaluate(() => window.changes)).toEqual(await original.evaluate(() => window.changes));
  }
  await context.close();
});

test('Twig renders escaped, zero and boolean icons before JavaScript', async ({ page }) => {
  for (const [icon, text] of [[0, '0'], [false, ''], [true, ''], ['<script>text', '<script>text']]) {
    const markup = render('animated-switch', { defaultChecked: true, onIcon: icon, label: '' });
    await page.setContent(markup);
    await expect(page.getByRole('switch')).toHaveAttribute('aria-label', '');
    await expect(page.locator('[data-icon-key]')).toHaveText(text);
    expect(await page.locator('script').count()).toBe(0);
  }
});

for (const dark of [false, true]) for (const reducedMotion of ['no-preference', 'reduce']) for (const size of ['sm', 'md', 'lg']) {
  test(`React switch trajectory ${dark ? 'dark' : 'light'} ${reducedMotion} ${size}`, async ({ browser }, info) => {
    test.setTimeout(120000);
    const context = await browser.newContext({ reducedMotion });
    const original = await context.newPage();
    const native = await context.newPage();
    await original.clock.install({ time: new Date(instant) });
    const options = { checked: false, size, onIcon: '+', offIcon: '-', label: 'Toggle' };
    await scene(original, true, options, dark);
    await scene(native, false, options, dark);
    await original.clock.pauseAt(new Date(instant + 1000));
    await original.clock.runFor(1000);
    const steps = [
      {}, { pointer: 'pointerdown' }, { pointer: 'pointermove', x: 65 }, { pointer: 'pointermove', x: 76, frames: [16, 32] },
      { pointer: 'pointermove', x: 69, frames: [16, 16] }, { pointer: 'pointerup', x: 80 }, { click: true },
      { update: { checked: true }, frames: [16, 32, 64] }, { update: { checked: false }, frames: [16, 32] }, { update: { checked: true } },
      { pointer: 'pointerdown', touch: true }, { pointer: 'pointermove', x: 54, touch: true }, { pointer: 'pointercancel', touch: true },
      { update: { checked: false } }, { update: { onIcon: null } }, { update: { checked: true } }, { update: { onIcon: '+', offIcon: null } },
      { update: { checked: false } }, { update: { onIcon: null, offIcon: null } }, { update: { checked: true, onIcon: '+', offIcon: '-' } },
      { pointer: 'pointerdown', primary: false }, { pointer: 'pointerup', primary: false },
      { pointer: 'pointerdown', frames: [1] }, { pointer: 'pointermove', x: 61, frames: [1] }, { pointer: 'pointerup', x: 61, expectedChange: false },
      { click: true }, { pointer: 'pointerdown', secondary: true, frames: [16] }, { pointer: 'pointermove', id: 2, x: 20, frames: [16] }, { pointer: 'pointercancel' },
      { update: { size: size === 'lg' ? 'sm' : 'lg' } }, { update: { size } },
      { update: { onIcon: 'fixture:svg', offIcon: 'fixture:svg' } }, { update: { checked: false }, frames: [16, 32, 64] }, { update: { checked: true } }
    ];
    const evidence = [];
    for (const [index, step] of steps.entries()) {
      await action(original, true, step);
      await action(native, false, step);
      for (const elapsed of step.frames ?? [16, 32, 64, 128, 256]) {
        await original.clock.runFor(elapsed);
        const expected = await frame(original);
        const actual = await frame(native);
        evidence.push({ index, elapsed, expected, actual });
        const message = `step ${index}: ${JSON.stringify({ expected, actual })}`;
        expect(actual.checked, message).toBe(expected.checked);
        expect(actual.changes, message).toEqual(expected.changes);
        if (step.expectedChange !== undefined) expect(actual.changes.at(-1), message).toBe(step.expectedChange);
        expect(actual.background, message).toBe(expected.background);
        for (const coordinate of ['x', 'y', 'width', 'height']) expect(actual.bounds[coordinate], message).toBeCloseTo(expected.bounds[coordinate], 4);
        expect(actual.icons.length, message).toBe(expected.icons.length);
        expect(actual.svgs.length, message).toBe(expected.svgs.length);
        for (const [position, svg] of expected.svgs.entries()) for (const coordinate of ['x', 'y', 'width', 'height']) expect(actual.svgs[position][coordinate], message).toBeCloseTo(svg[coordinate], 4);
        for (const [position, icon] of expected.icons.entries()) {
          expect(actual.icons[position].text, message).toBe(icon.text);
          expect(actual.icons[position].opacity, message).toBeCloseTo(icon.opacity, 4);
          for (const [coordinate, value] of icon.matrix.entries()) expect(actual.icons[position].matrix[coordinate], message).toBeCloseTo(value, 4);
        }
        const clip = { x: 48, y: 48, width: 80, height: 64 };
        const first = await original.screenshot({ clip });
        const second = await native.screenshot({ clip });
        const left = PNG.sync.read(first);
        const right = PNG.sync.read(second);
        const difference = pixelmatch(left.data, right.data, null, left.width, left.height, { threshold: .05 });
        if (difference) { writeFileSync(info.outputPath(`${index}-react.png`), first); writeFileSync(info.outputPath(`${index}-twig.png`), second); }
        expect(difference, message).toBe(0);
      }
    }
    writeFileSync(info.outputPath('trajectories.json'), JSON.stringify(evidence, null, 2));
    await context.close();
  });
}

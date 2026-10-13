import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { render } from '../render.mjs';

export async function fieldSuite(name) {
  const textarea = name === 'acervo-textarea';
  const tag = textarea ? 'textarea' : 'input';
  const controller = textarea ? 'AcervoTextarea' : 'AcervoInput';
  const production = await build({ entryPoints: [`src/${name}.ts`], bundle: true, write: false, metafile: true });
  test(`${name}: production dependency graph excludes React`, () => {
    expect(Object.keys(production.metafile.inputs).filter((file) => /node_modules\/(react|react-dom)\//.test(file))).toEqual([]);
  });
  const reference = await build({ entryPoints: [`tests/reference/${tag}.tsx`], bundle: true, write: false, format: 'iife', jsx: 'automatic', alias: { '@': resolve('tests/reference/src') }, define: { 'process.env.NODE_ENV': '"production"' } });
  const php = String.raw`require $argv[1]; $minifier = str_ends_with($argv[2], '.js') ? new \MatthiasMullie\Minify\JS($argv[2]) : new \MatthiasMullie\Minify\CSS($argv[2]); echo $minifier->minify();`;
  const autoload = process.env.MAUTIC_VENDOR_AUTOLOAD ?? resolve('../../../../../vendor/autoload.php');
  const css = execFileSync('php', ['-r', php, autoload, resolve(`../css/99.${name}.css`)], { encoding: 'utf8' });
  const script = execFileSync('php', ['-r', php, autoload, resolve(`../js/99.${name}.js`)], { encoding: 'utf8' });
  const theme = readFileSync(`tests/reference/${tag}.generated.css`, 'utf8');
  const font = readFileSync('../css/fonts/acervo-manrope-400.ttf').toString('base64');
  const common = `${theme}@font-face{font-family:Manrope;src:url(data:font/ttf;base64,${font})}@font-face{font-family:"Acervo Manrope";src:url(data:font/ttf;base64,${font})}body{padding:24px}#reference{width:300px} [data-component]{width:300px}input,textarea{caret-color:transparent}`;

  async function scene(page, original, options = {}, dark = false) {
    await page.setContent(`<style>${common}${original ? '' : css}</style>${original ? '<div id="reference"></div>' : `<div id="reference">${render(name, { label: 'Field', ...options })}</div>`}`);
    await page.evaluate(({ options, dark }) => { window.referenceOptions = options; document.documentElement.classList.toggle('dark', dark); }, { options, dark });
    await page.addScriptTag({ content: original ? reference.outputFiles[0].text : script });
    await page.evaluate(() => document.fonts.ready);
  }

  test(`${name}: native behavior, controlled values, selection and callback`, async ({ browser }) => {
    const context = await browser.newContext();
    const original = await context.newPage();
    const native = await context.newPage();
    await scene(original, true, { defaultValue: 'Start', name: 'content', required: true });
    await scene(native, false, { defaultValue: 'Start', name: 'content', required: true });
    await native.evaluate((controller) => { window.changes = []; window.MauticUI[controller].get(document.querySelector('[data-component]')).update({ onChange: (event) => window.changes.push(event.target.value) }); }, controller);
    for (const page of [original, native]) await page.locator(tag).fill('Edited');
    expect(await native.evaluate(() => window.changes)).toEqual(await original.evaluate(() => window.changes));
    for (const value of ['Locked', 0, '', null]) {
      await original.evaluate((value) => window.referenceUpdate({ value }), value);
      await native.evaluate(({ controller, value }) => window.MauticUI[controller].get(document.querySelector('[data-component]')).update({ value }), { controller, value });
      for (const page of [original, native]) await page.locator(tag).fill('Attempt');
      expect(await native.locator(tag).inputValue()).toBe(await original.locator(tag).inputValue());
    }
    for (const page of [original, native]) await page.locator(tag).evaluate((element) => { element.setSelectionRange(1, 3); });
    expect(await native.locator(tag).evaluate((element) => [element.selectionStart, element.selectionEnd])).toEqual(await original.locator(tag).evaluate((element) => [element.selectionStart, element.selectionEnd]));
    await context.close();
  });

  test(`${name}: original defaultValue update semantics`, async ({ browser }) => {
    const context = await browser.newContext();
    const original = await context.newPage();
    const native = await context.newPage();
    await scene(original, true, { defaultValue: 'Base' });
    await scene(native, false, { defaultValue: 'Base' });
    for (const options of [{ value: 'Controlled' }, { defaultValue: 'New' }, { value: null }, { defaultValue: 'Last' }]) {
      await original.evaluate((options) => window.referenceUpdate(options), options);
      await native.evaluate(({ controller, options }) => window.MauticUI[controller].get(document.querySelector('[data-component]')).update(options), { controller, options });
      const state = (element) => [element.value, element.defaultValue];
      expect(await native.locator(tag).evaluate(state)).toEqual(await original.locator(tag).evaluate(state));
    }
    await context.close();
  });

  test(`${name}: escaping, disabled and native form contract`, async ({ page }) => {
    const markup = render(name, { name: 'content', defaultValue: '<tag>\n0', label: 'Field', required: true, disabled: false, readOnly: false, maxLength: 20 });
    expect(markup).not.toContain('<tag>');
    await page.setContent(`<form>${markup}<button type="reset">Reset</button></form>`);
    await page.addScriptTag({ content: script });
    expect(await page.locator(tag).inputValue()).toBe('<tag>\n0'.replace(textarea ? /$^/ : /\n/g, ''));
    await page.locator(tag).fill('Changed');
    expect(await page.evaluate(() => new FormData(document.querySelector('form')).get('content'))).toBe('Changed');
    await page.getByText('Reset').click();
    expect(await page.locator(tag).inputValue()).toBe(textarea ? '<tag>\n0' : '<tag>0');
    await page.evaluate((controller) => window.MauticUI[controller].get(document.querySelector('[data-component]')).update({ disabled: true }), controller);
    await expect(page.locator(tag)).toBeDisabled();
    expect(await page.evaluate(() => new FormData(document.querySelector('form')).has('content'))).toBe(false);
  });

  test(`${name}: AJAX lifecycle and value zero`, async ({ page }) => {
    await scene(page, false, { value: 0 });
    await expect(page.locator(tag)).toHaveValue('0');
    const markup = render(name, { id: 'added', defaultValue: 'Added' });
    await page.evaluate((markup) => document.body.insertAdjacentHTML('beforeend', markup), markup);
    await expect.poll(() => page.evaluate((controller) => Boolean(window.MauticUI[controller].get(document.querySelector('#added'))), controller)).toBe(true);
    await page.evaluate(() => { window.removed = document.querySelector('#added'); window.removed.remove(); });
    await expect.poll(() => page.evaluate((controller) => window.MauticUI[controller].get(window.removed) === undefined, controller)).toBe(true);
  });

  test(`${name}: native attributes and change-event API`, async ({ page }) => {
    await scene(page, false, { defaultValue: 'Text', spellCheck: false });
    expect(await page.locator(tag).getAttribute('spellcheck')).toBe('false');
    await page.evaluate((controller) => {
      const field = window.MauticUI[controller].get(document.querySelector('[data-component]'));
      field.update({ maxLength: 30, placeholder: 'Hint', required: true, onChange: (event) => {
        window.eventContract = { type: event.type, nativeType: event.nativeEvent.type, target: event.target === field.element, currentTarget: event.currentTarget === field.element, prevented: event.isDefaultPrevented() };
        event.persist();
        field.update({ value: event.target.value.toUpperCase() });
      } });
    }, controller);
    await page.locator(tag).fill('changed');
    await expect(page.locator(tag)).toHaveValue('CHANGED');
    expect(await page.evaluate(() => window.eventContract)).toEqual({ type: 'change', nativeType: 'input', target: true, currentTarget: true, prevented: false });
    await expect(page.locator(tag)).toHaveAttribute('maxlength', '30');
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });

  const cases = [{ placeholder: 'Write here' }, { defaultValue: 'Example' }, { defaultValue: 'Example', disabled: true }, { defaultValue: 'Example', readOnly: true }, { defaultValue: 'Example', required: true, attributes: { 'aria-invalid': 'true' } }];
  if (!textarea) cases.push({ type: 'password', defaultValue: 'secret-example' }, { type: 'number', value: 0, min: 0, step: .1 }, { type: 'file' });
  for (const width of [375, 1024]) {
    for (const dark of [false, true]) {
      test(`${name}: original React pixels ${width}, ${dark ? 'dark' : 'light'}`, async ({ browser }, info) => {
        const context = await browser.newContext({ viewport: { width, height: 400 } });
        const original = await context.newPage();
        const native = await context.newPage();
        const results = [];
        for (const [index, options] of cases.entries()) {
          const sourceOptions = { ...options, ...(options.attributes ?? {}) };
          delete sourceOptions.attributes;
          await scene(original, true, sourceOptions, dark);
          await scene(native, false, options, dark);
          for (const focused of [false, true]) {
            if (focused && options.disabled) continue;
            if (focused) for (const page of [original, native]) await page.locator(tag).focus();
            const geometry = await original.locator(tag).boundingBox();
            expect(await native.locator(tag).boundingBox()).toEqual(geometry);
            const clip = { x: 16, y: 16, width: 320, height: Math.ceil(geometry.height) + 16 };
            const left = await original.screenshot({ clip });
            const right = await native.screenshot({ clip });
            const first = PNG.sync.read(left);
            const second = PNG.sync.read(right);
            const changed = pixelmatch(first.data, second.data, null, first.width, first.height, { threshold: .05 });
            results.push({ index, focused, width, dark, changed });
            if (changed) {
              writeFileSync(info.outputPath(`${index}-${focused}-react.png`), left);
              writeFileSync(info.outputPath(`${index}-${focused}-twig.png`), right);
            }
            expect(changed, JSON.stringify({ options, focused, width, dark })).toBe(0);
          }
        }
        writeFileSync(info.outputPath('comparison.json'), JSON.stringify(results, null, 2));
        await context.close();
      });
    }
  }
}

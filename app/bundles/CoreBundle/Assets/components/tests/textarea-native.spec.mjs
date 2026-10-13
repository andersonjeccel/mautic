import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { render } from './render.mjs';

const reference = await build({ entryPoints: ['tests/reference/textarea.tsx'], bundle: true, write: false, format: 'iife', jsx: 'automatic', alias: { '@': resolve('tests/reference/src') }, define: { 'process.env.NODE_ENV': '"production"' } });

for (const value of ['\nFirst\nSecond', 'First\nSecond', 0, '<script>&value']) {
  test(`textarea preserves original React multiline value ${JSON.stringify(value)}`, async ({ browser }) => {
    const context = await browser.newContext();
    const original = await context.newPage();
    const native = await context.newPage();
    await original.setContent('<div id="reference"></div>');
    await original.evaluate((value) => { window.referenceOptions = { defaultValue: value, rows: 5, cols: 40, wrap: 'hard' }; }, value);
    await original.addScriptTag({ content: reference.outputFiles[0].text });
    await native.setContent(render('acervo-textarea', { defaultValue: value, rows: 5, cols: 40, wrap: 'hard' }));
    await native.addScriptTag({ path: resolve('../js/99.acervo-textarea.js') });
    const properties = (element) => [element.value, element.defaultValue, element.rows, element.cols, element.wrap];
    expect(await native.locator('textarea').evaluate(properties)).toEqual(await original.locator('textarea').evaluate(properties));
    await context.close();
  });
}

test('textarea keeps the original forced-colors focus outline', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.setContent(`<style>${readFileSync('../css/99.acervo-textarea.css', 'utf8')}</style>${render('acervo-textarea', { label: 'Field' })}`);
  await page.locator('textarea').focus();
  expect(await page.locator('textarea').evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.outlineStyle, style.outlineWidth, style.outlineOffset, style.resize];
  })).toEqual(['solid', '2px', '2px', 'vertical']);
});

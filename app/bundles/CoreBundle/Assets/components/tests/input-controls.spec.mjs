import { test, expect } from '@playwright/test';
import { render } from './render.mjs';
import { resolve } from 'node:path';

async function load(page, markup) {
  await page.setContent(markup);
  await page.addScriptTag({ path: resolve('../js/99.acervo-input.js') });
}

test('controlled checkbox requests changes and null restores uncontrolled behavior', async ({ page }) => {
  await load(page, render('acervo-input', { type: 'checkbox', checked: true }));
  await page.evaluate(() => {
    window.changes = [];
    window.MauticUI.AcervoInput.get(document.querySelector('input')).update({ onChange: (event) => window.changes.push([event.type, event.nativeEvent.type, event.target.checked]) });
  });
  await page.locator('input').click();
  await expect(page.locator('input')).toBeChecked();
  expect(await page.evaluate(() => window.changes)).toEqual([['change', 'click', false]]);
  await page.evaluate(() => window.MauticUI.AcervoInput.get(document.querySelector('input')).update({ checked: null }));
  await page.locator('input').click();
  await expect(page.locator('input')).not.toBeChecked();
});

test('controlled radio siblings restore their original group selection', async ({ page }) => {
  await load(page, render('acervo-input', { type: 'radio', name: 'group', id: 'first', checked: true }) + render('acervo-input', { type: 'radio', name: 'group', id: 'second', checked: false }));
  await page.locator('#second').click();
  await expect(page.locator('#first')).toBeChecked();
  await expect(page.locator('#second')).not.toBeChecked();
});

test('file uploads retain FileList and emit one change event', async ({ page }) => {
  await load(page, render('acervo-input', { type: 'file' }));
  await page.evaluate(() => {
    window.changes = [];
    window.MauticUI.AcervoInput.get(document.querySelector('input')).update({ onChange: (event) => window.changes.push([event.type, event.nativeEvent.type, event.target.files[0].name]) });
  });
  await page.locator('input').setInputFiles({ name: 'example.txt', mimeType: 'text/plain', buffer: Buffer.from('Example') });
  expect(await page.evaluate(() => window.changes)).toEqual([['change', 'change', 'example.txt']]);
  expect(await page.locator('input').evaluate((element) => element.files.length)).toBe(1);
});

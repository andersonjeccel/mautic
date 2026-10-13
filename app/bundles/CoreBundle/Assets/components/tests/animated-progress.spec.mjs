import { test, expect } from '@playwright/test';
import { load, render } from './render.mjs';

for (const [options, state, value] of [[{}, 'indeterminate', null], [{ value: null }, 'indeterminate', null], [{ value: 0 }, 'loading', '0'], [{ value: 42 }, 'loading', '42'], [{ value: 100 }, 'complete', '100'], [{ max: 50, value: 50 }, 'complete', '50'], [{ max: 0, value: 50 }, 'loading', '50'], [{ value: -1 }, 'indeterminate', null], [{ value: 101 }, 'indeterminate', null]]) {
  test(`state ${JSON.stringify(options)}`, async ({ page }) => {
    await load(page, 'animated-progress', { label: 'Progress', ...options });
    const progress = page.getByRole('progressbar');
    await expect(progress).toHaveAttribute('data-state', state);
    if (value === null) expect(await progress.getAttribute('aria-valuenow')).toBeNull();
    else await expect(progress).toHaveAttribute('aria-valuenow', value);
    await expect(progress).toHaveCSS('height', '8px');
  });
}

test('updates change metadata, animation and custom accessible value label', async ({ page }) => {
  await load(page, 'animated-progress', { value: 0 });
  await page.evaluate(() => window.MauticUI.AnimatedProgress.get(document.querySelector('[data-component]')).update({ value: 60, max: 200, getValueLabel: (value, max) => `${value} of ${max}` }));
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '60 of 200');
  await expect.poll(() => page.locator('[data-slot="progress-indicator"]').evaluate((element) => {
    const translation = new DOMMatrix(getComputedStyle(element).transform).m41;
    return Math.round(translation / element.clientWidth * 100);
  })).toBe(-40);
});

test('reduced motion renders the final transform immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await load(page, 'animated-progress', { value: 25 });
  await expect.poll(() => page.locator('[data-slot="progress-indicator"]').evaluate((element) => Math.round(new DOMMatrix(getComputedStyle(element).transform).m41 / element.clientWidth * 100))).toBe(-75);
});

test('AJAX mount and removal release the controller', async ({ page }) => {
  await load(page, 'animated-progress', { value: 0 });
  await page.evaluate((html) => document.body.insertAdjacentHTML('beforeend', html), render('animated-progress', { label: 'Inserted', value: 75 }));
  await expect(page.getByRole('progressbar', { name: 'Inserted' })).toHaveAttribute('aria-valuenow', '75');
  await page.evaluate(() => { window.removed = document.querySelector('[data-component]'); window.removed.remove(); });
  await expect.poll(() => page.evaluate(() => window.MauticUI.AnimatedProgress.get(window.removed) === undefined)).toBe(true);
});

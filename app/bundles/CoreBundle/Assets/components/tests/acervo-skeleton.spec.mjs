import { test, expect } from '@playwright/test';
import { load, render } from './render.mjs';

test('original pulse timing, radius and background', async ({ page }) => {
  await load(page, 'acervo-skeleton', { attributes: { style: 'width:240px;height:32px' } });
  const skeleton = page.locator('.acervo-skeleton');
  await expect(skeleton).toHaveCSS('width', '240px');
  await expect(skeleton).toHaveCSS('height', '32px');
  await expect(skeleton).toHaveCSS('border-radius', '6.4px');
  await expect(skeleton).toHaveCSS('background-color', 'rgb(233, 226, 214)');
  await expect(skeleton).toHaveCSS('animation-duration', '2s');
  await expect(skeleton).toHaveCSS('animation-timing-function', 'cubic-bezier(0.4, 0, 0.6, 1)');
  const middle = await skeleton.evaluate((element) => {
    const animation = element.getAnimations()[0];
    animation.pause();
    animation.currentTime = 1000;
    return Number(getComputedStyle(element).opacity);
  });
  expect(middle).toBe(.5);
});

test('dark token and host theme override', async ({ page }) => {
  await load(page, 'acervo-skeleton');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect(page.locator('.acervo-skeleton')).toHaveCSS('background-color', 'rgb(48, 48, 41)');
  await page.locator('.acervo-skeleton').evaluate((element) => element.style.setProperty('--acervo-muted', '#123456'));
  await expect(page.locator('.acervo-skeleton')).toHaveCSS('background-color', 'rgb(18, 52, 86)');
});

test('native attributes, classes and children are escaped', () => {
  const html = render('acervo-skeleton', { id: 'loading', className: 'custom', attributes: { 'aria-hidden': 'true', 'data-state': '<unsafe>' }, children: '<script>bad</script>' });
  expect(html).toContain('id="loading"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('custom');
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('="<unsafe>"');
});

test('styles do not affect unrelated elements', async ({ page }) => {
  await load(page, 'acervo-skeleton', {}, '<div id="unrelated">Other content</div>');
  await expect(page.locator('#unrelated')).toHaveCSS('animation-name', 'none');
});

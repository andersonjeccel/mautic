import { test, expect } from '@playwright/test';
import { load, render } from './render.mjs';

for (const [width, fontSize] of [[375, 48], [768, 60], [1440, 60]]) {
  test(`responsive heading at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 768 });
    await load(page, 'acervo-page-title', { children: 'Page title' });
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toHaveText('Page title');
    await expect(heading).toHaveCSS('font-size', `${fontSize}px`);
    await expect(heading).toHaveCSS('line-height', `${fontSize}px`);
    await expect(heading).toHaveCSS('font-weight', '400');
    await expect(heading).toHaveCSS('margin-top', '0px');
  });
}

test('classes, id, attributes and text are escaped', () => {
  const html = render('acervo-page-title', { children: '<script>bad</script>', className: 'custom', id: 'heading', attributes: { 'data-state': 'ready' } });
  expect(html).toContain('id="heading"');
  expect(html).toContain('custom');
  expect(html).toContain('data-state="ready"');
  expect(html).not.toContain('<script>');
});

test('dark theme and foreground override', async ({ page }) => {
  await load(page, 'acervo-page-title', { children: 'Title' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect(page.getByRole('heading')).toHaveCSS('color', 'rgb(250, 247, 241)');
  await page.getByRole('heading').evaluate((element) => element.style.setProperty('--acervo-foreground', '#123456'));
  await expect(page.getByRole('heading')).toHaveCSS('color', 'rgb(18, 52, 86)');
});

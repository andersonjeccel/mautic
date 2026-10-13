import { test, expect } from '@playwright/test';
import { load, render } from './render.mjs';

for (const orientation of ['horizontal', 'vertical']) {
  for (const decorative of [true, false]) {
    test(`${orientation} decorative ${decorative}`, async ({ page }) => {
      await load(page, 'acervo-separator', { orientation, decorative });
      const separator = page.locator('.acervo-separator');
      await expect(separator).toHaveAttribute('role', decorative ? 'none' : 'separator');
      if (!decorative && orientation === 'vertical') await expect(separator).toHaveAttribute('aria-orientation', 'vertical');
      else expect(await separator.getAttribute('aria-orientation')).toBeNull();
      await expect(separator).toHaveCSS(orientation === 'vertical' ? 'width' : 'height', '1px');
    });
  }
}

test('default is decorative horizontal; classes, attributes and text are escaped', () => {
  const html = render('acervo-separator', { className: 'custom', id: 'separator', attributes: { 'data-test': '<unsafe>' }, children: '<script>bad</script>' });
  expect(html).toContain('role="none"');
  expect(html).toContain('data-orientation="horizontal"');
  expect(html).toContain('custom');
  expect(html).not.toContain('<script>');
});

test('dark theme uses the original border token', async ({ page }) => {
  await load(page, 'acervo-separator');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect(page.locator('.acervo-separator')).toHaveCSS('background-color', 'rgba(250, 247, 241, 0.14)');
});

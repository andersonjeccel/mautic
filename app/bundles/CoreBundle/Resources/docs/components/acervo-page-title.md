# PageTitle

Twig equivalent of Acervo's Spectrum UI PageTitle. The original Bricolage Grotesque variable font is bundled with its OFL license. No JavaScript runtime is needed.

```twig
{% include '@MauticCore/Components/acervo-page-title.html.twig' with {
    children: 'mautic.example.page_title', id: 'page-title'
} only %}
```

Renders an h1 with 48px type below 768px, 60px from 768px, line height 1, tracking -0.025em and the original heading font. `children` is required, translated and escaped. Use the `children` block with Twig `embed` for rich content. `className`, `id` and `attributes` map native h1 customization. `.dark` supplies the original light foreground; `--acervo-foreground` overrides the color.

## Verification

From `Assets/components`, run `npm ci`, `npm run build`, `npx playwright install --with-deps chromium`, `npm test`, through DDEV locally. Six React/Twig screenshots (375px, 1024px, 1440px; light/dark) matched dimensions and had zero Pixelmatch differences at threshold 0.05. Five Chromium tests cover narrow, breakpoint and wide typography, heading semantics, escaping, dark theme and host colors. Actual Twig rendering and the PHP CSS minifier are also exercised. CI discovers the suite in `core-components.yml`.

# Separator

Native Twig equivalent of Acervo's shadcn/Radix Separator. No JavaScript runtime is needed; the source has no application state or event handler.

```twig
{% include '@MauticCore/Components/acervo-separator.html.twig' with {
    orientation: 'horizontal', decorative: false
} only %}
```

`orientation` defaults to `horizontal`; `vertical` occupies the parent's full height. `decorative` defaults to true and renders `role="none"`. A semantic separator renders `role="separator"`; the vertical version also has `aria-orientation="vertical"`. `className`, `id`, `attributes` and the `children` block provide native element customization. Attribute values and text are escaped. `.dark` selects the original dark border token; `--acervo-border` overrides it. Change `data-orientation` directly when the orientation changes at runtime.

From `Assets/components`, run `npm ci`, `npm run build`, `npx playwright install --with-deps chromium`, `npm test`, through DDEV locally. Four React/Twig screenshots (both orientations, light/dark) matched dimensions and had zero Pixelmatch differences at threshold 0.05. Six Chromium tests check roles, decorative false, orientations, dimensions, dark theme and escaping. The test tooling also renders real Twig and checks the PHP CSS minifier; CI discovers it in `core-components.yml`.

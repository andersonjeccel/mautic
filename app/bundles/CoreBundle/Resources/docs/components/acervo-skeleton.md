# Skeleton

Twig equivalent of Acervo's shadcn Skeleton. No JavaScript runtime is needed.

```twig
{% include '@MauticCore/Components/acervo-skeleton.html.twig' with {
    className: 'custom-loading-shape', attributes: {'aria-hidden': 'true'}
} only %}
```

Preserves the 6.4px rounded corners, source muted background and 2s pulse with `cubic-bezier(.4, 0, .6, 1)`, reaching opacity 0.5 at its midpoint. Width and height come from the caller, as in React. `className`, `id`, `attributes` and the `children` block map native div customization; values are escaped. `.dark` uses the original dark muted color; `--acervo-muted` supplies a host theme override. The original does not add ARIA roles or reduced-motion behavior automatically; those remain caller decisions.

## Verification

From `Assets/components`, run `npm ci`, `npm run build`, `npx playwright install --with-deps chromium`, `npm test`, through DDEV locally. Two light/dark screenshots matched the React original in dimensions and had zero Pixelmatch differences at threshold 0.05 with pulse animations disabled for capture. Four Chromium tests check animation timing and its actual midpoint, shape, dark theme, host overrides, escaping and selector isolation. Real Twig rendering and PHP CSS minification are also exercised. CI discovers the suite in `core-components.yml`.

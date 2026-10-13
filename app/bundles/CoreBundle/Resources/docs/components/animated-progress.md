# AnimatedProgress

Twig/JavaScript equivalent of the Animate UI Progress component and its Radix primitive, without React.

```twig
{% include '@MauticCore/Components/animated-progress.html.twig' with {
    value: 42, max: 100, label: 'mautic.example.progress'
} only %}
```

Options: `value` (omitted/null is indeterminate), `max` (100), `label`, `id`, `className`, `indicatorClassName`, `attributes`, and indicator `transition` (spring stiffness 100, damping 30). Translation and attribute escaping follow Mautic. The track is 8px high with a 20% primary-color background and a rounded full-width indicator. `.dark` selects the original dark primary color; `--acervo-primary` overrides the theme.

```javascript
const element = document.querySelector('[data-component="animated-progress"]');
const progress = window.MauticUI.AnimatedProgress.get(element);
progress.update({ value: 60, max: 200, getValueLabel: (value, max) => `${value} of ${max}` });
```

The ARIA percentage respects `max`. The indicator intentionally uses `value` directly as a percentage, as in the original source, rather than normalizing by `max`. Use `max: 100` for the normal percentage contract. Invalid values become indeterminate and invalid maximums become 100, following Radix. State changes update the root and indicator data attributes together. Updates emit `mautic:animated-progress:change` with `{ value, max }`. AJAX mounts initialize automatically; removal stops animations. Reduced-motion users receive the final transform directly.

## Verification

Run `npm ci`, `npm run build`, `npx playwright install --with-deps chromium`, `npm test` from `Assets/components`, through DDEV locally. The tooling checks strict TypeScript, actual Twig rendering, both Mautic PHP minifiers and Chromium interaction. CI discovers the suite in `core-components.yml`. Ten stable screenshots of the original React component matched dimensions and had zero Pixelmatch differences at threshold 0.05 (null, 0, 25, 75, 100; light/dark). Twelve browser tests cover initial states, zero/null/invalid values, custom maximum, runtime updates, custom value labels, transforms, reduced motion and lifecycle.

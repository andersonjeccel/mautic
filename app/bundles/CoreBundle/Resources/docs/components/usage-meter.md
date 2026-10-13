# UsageMeter

Independent port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/usage-meter.tsx`.

```twig
{% include '@MauticCore/Components/usage-meter.html.twig' with {
    usage: {promptTokens: 1500, completionTokens: 250, contextWindow: 8192, estimatedCostUsd: 0},
    variant: 'Bar',
    className: 'context-usage'
} only %}
```

`usage` is required. `Bar` is the default; `Inline` uses the compact track and omits meter ARIA, as in the reference. Estimated cost is absent when undefined and visible when zero. The CoreBundle controller fills numeric labels and percentage using the original JavaScript Math.round/toFixed rules. JavaScript initialization is required for the canonical numeric presentation; Twig provides its structure and escaped usage configuration.

```javascript
const element = document.querySelector('[data-component="usage-meter"]');
window.MauticUI.UsageMeter.get(element).update({
    usage: {promptTokens: 3000, completionTokens: 1000, contextWindow: 8192},
    variant: 'Inline'
});
```

`update()` accepts usage, variant and className. Usage replaces the complete controlled object; changing class or cost leaves the current fill node intact. Variant changes recreate the branch structure like React. Increased or decreased widths use the original 500ms cubic-bezier(.23,1,.32,1), including interrupted retargeting. The original has no reduced-motion override for this CSS transition, so the port does not add one.

Color depends on the unrounded ratio: neutral through 75%, amber above 75% through 90%, red above 90%. Only the bar ratio is upper-clamped; raw used and contextWindow values remain in ARIA. Zero context reproduces the reference's NaN text and browser rejection of invalid width, without hiding it behind invented validation. Text-node segmentation preserves React's fractional glyph rounding and widths. Initial controller hydration suppresses an unintended transition from the empty server-rendered track before applying the initial width.

## Verification

17 tests, 694 temporal comparisons in 16 theme/motion/viewport/variant configurations plus interruption/branch updates. Exact node geometry, text, colors, radius and ARIA match the byte-preserved React fixture. Pixels have no differences above Pixelmatch threshold 0.05. Coverage includes 75/90% boundaries, rounded-percentage versus color thresholds, over-limit values, 1250/1450 token rounding, fractional and zero costs, omission, class/default restoration, zero context and removal cleanup.

Fixtures use paused CSS transitions and explicit times with Chromium's --disable-threaded-animation. An independent normal-Chromium probe exercises the actual unpaused PHP-minified combined assets. Production inputs are only the local lifecycle and usage-meter sources: no React/Motion/external runtime dependencies.

Run `npm run build && npm test` in Assets/components; CI generates the reference Tailwind CSS. Source hashes are in `sources-usage-meter.json`.

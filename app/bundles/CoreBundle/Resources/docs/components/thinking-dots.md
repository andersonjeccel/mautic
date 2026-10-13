# ThinkingDots

Standalone CoreBundle port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/thinking-dots.tsx`.

```twig
{% include '@MauticCore/Components/thinking-dots.html.twig' with {
    label: 'Working',
    variant: 'Dots',
    className: 'my-indicator'
} only %}
```

Variants: 'Dots' or 'Bar'. Optional label and className retain empty strings and label '0'. The initial DOM is fully rendered by Twig and the animation CSS is discovered by the normal CoreBundle asset pipeline.

```javascript
const element = document.querySelector('[data-component="thinking-dots"]');
window.MauticUI.ThinkingDots.get(element).update({label: 'New label', variant: 'Dots'});
```

`update()` accepts label, variant and className. Undefined restores the original default. Same-variant or text/class-only updates preserve existing animated nodes and CSS animation instances. No React, Motion or other external runtime is required. Removing the element disposes the scoped controller; reinsertion creates a fresh instance.

## Fidelity and checks

17 tests passed. 171 temporal comparisons check exact geometry, colors, radii, transforms, opacity and shimmer background position/image across light/dark, reduced motion and 375/1024px viewports, plus variant/text/class updates. Reference source is preserved byte-for-byte and hashed in `sources-thinking-dots.json`. Pixelmatch threshold is 0.05, with no differing pixels above that threshold in tested samples. Empty labels and escaped markup are compared directly against React.

Trajectory fixtures pause CSS animations and seek explicit times in Chromium with `--disable-threaded-animation`. They also assert animation-instance identity during unchanged-variant updates. A normal-Chromium PHP-minified combined-assets probe separately exercises actual unpaused animations and lifecycle.

Run `npm run build && npm test` from `Assets/components`; CI generates reference Tailwind CSS. Browser artifacts live outside product assets.

The status role and accessible label mirror the reference. Dots use three 1200ms trajectories staggered by 160ms; the quarter-width bar traverses its 40px track in 1100ms. Reduced motion disables exactly these animations without inventing a dimmed static dot state.

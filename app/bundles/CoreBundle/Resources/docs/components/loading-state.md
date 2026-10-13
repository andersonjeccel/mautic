# LoadingState

Standalone CoreBundle port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/loading-state.tsx`.

```twig
{% include '@MauticCore/Components/loading-state.html.twig' with {
    label: 'Working',
    variant: 'Drive',
    className: 'my-indicator'
} only %}
```

Variants: 'Drive', 'Dots' or 'Orbit'. Optional label and className retain empty strings and label '0'. The initial DOM is fully rendered by Twig and the animation CSS is discovered by the normal CoreBundle asset pipeline.

```javascript
const element = document.querySelector('[data-component="loading-state"]');
window.MauticUI.LoadingState.get(element).update({label: 'New label', variant: 'Drive'});
```

`update()` accepts label, variant and className. Undefined restores the original default. Same-variant or text/class-only updates preserve existing animated nodes and CSS animation instances. No React, Motion or other external runtime is required. Removing the element disposes the scoped controller; reinsertion creates a fresh instance.

## Fidelity and checks

26 tests passed. 255 temporal comparisons check exact geometry, colors, radii, transforms, opacity and shimmer background position/image across light/dark, reduced motion and 375/1024px viewports, plus variant/text/class updates. Reference source is preserved byte-for-byte and hashed in `sources-loading-state.json`. Pixelmatch threshold is 0.05, with no differing pixels above that threshold in tested samples. Empty labels and escaped markup are compared directly against React.

Trajectory fixtures pause CSS animations and seek explicit times in Chromium with `--disable-threaded-animation`. They also assert animation-instance identity during unchanged-variant updates. A normal-Chromium PHP-minified combined-assets probe separately exercises actual unpaused animations and lifecycle.

Run `npm run build && npm test` from `Assets/components`; CI generates reference Tailwind CSS. Browser artifacts live outside product assets.

The 3x3 Drive/Dots delay pattern, eight-cell Orbit path with a dim center, and 1400ms label shimmer match the source. Reduced motion preserves base pixel opacity and restores inherited label color. Elapsed time counts interval callbacks in deciseconds, not wall time, preserving the original behavior under throttling. Tests cross 59.9s to 1m 0.0s, retain elapsed state across updates, clear the interval on removal, reset on reinsertion and isolate multiple instances.

# SuggestionBanner

Standalone CoreBundle port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/suggestion-banner.tsx`.

```twig
{% include '@MauticCore/Components/suggestion-banner.html.twig' with {
    suggestion: 'Flag Meridian Lines in the weekly carrier report',
    detail: 'Based on the recent SLA breach.',
    applyLabel: 'Apply',
    variant: 'Floating',
    className: 'carrier-suggestion'
} only %}
```

All source props are optional. Default variant is Inline; Floating adds the exact source shadow. Empty suggestion/applyLabel remain empty, string zero is preserved, and empty detail is omitted. Undefined values restore the translated server defaults. Labels and JSON attributes are escaped. The exact Lucide Sparkles, X and Check paths and stroke widths are included, with attribution in lucide-ISC.txt.

```javascript
const mount = document.querySelector('[data-component="suggestion-banner"]');
const banner = window.MauticUI.SuggestionBanner.get(mount);
banner.update({onApply: () => applySuggestion(), onDismiss: () => dismissSuggestion()});
banner.update({state: 'open'});
banner.update({state: undefined});
mount.addEventListener('mautic:suggestion-banner:apply', event => {});
mount.addEventListener('mautic:suggestion-banner:dismiss', event => {});
```

update accepts suggestion, detail, applyLabel, state, onApply, onDismiss, variant and className. Omitted props remain unchanged. State is open/applied/dismissed. Undefined state releases control and exposes internal state. Every accepted action changes internal state even if controlled state keeps the visible banner open. Callbacks see pre-render DOM, matching React event batching; custom event detail carries internal state. Callback exceptions propagate, with pending local rendering completed in finally.

An invisible display:contents mount retains the controller and inert Twig view prototypes. Dismissal removes the visible banner, its buttons and ARIA content without discarding internal state, matching React null output; updates can restore it. Removing the mount disposes delegation. Remounting initializes from server options and resets internal state to open. Both buttons have type=button and preserve native keyboard/form behavior. Only applied content has role=status; dismiss retains its source ARIA label.

Applied caption uses JavaScript charAt(0).toLowerCase() plus slice(1), not locale-aware or grapheme-aware lowercasing, matching the source even for dotted I and surrogate pairs. The literal prefix and dynamic caption remain separate React-equivalent text nodes; an empty caption does not create an extra empty text node.

## Motion fidelity

Applied root uses 240ms opacity/translateY(4px) entry; Check uses 200ms opacity/scale(0.85) pop. Both use cubic-bezier(0.23,1,0.32,1) and fill both. Only these entry keyframes are motion-safe: reduced motion suppresses them, but does not suppress the source button hover/press transitions. Unchanged applied text/variant/class renders retain root, icon and animation instances; returning to applied after dismissal creates a fresh entry. The dismiss button individual scale is immediate because its transition list excludes scale; Apply scale animates over 160ms. Light/dark hover transitions and forced-colors focus outline match the original.

## Validation

34 browser tests passed with 373 exact temporal comparisons, including 16 theme/motion/viewport/variant configurations, direct controlled initial states, interrupted/recovered states, controlled callbacks/release, custom/escaped/empty/zero/Unicode labels, real hover/press/focus, forced colors, native Enter/Space without submit, node/animation identity, disposal and remount.

Deterministic sampling uses Chromium --disable-threaded-animation. It pauses/seeks declared CSS animations and cancels orphan CSSAnimation objects retained only by previous manual seeks after their animation-name disappears; otherwise seeking can revive a removed class's old effect. This is test-only behavior. A separate normal unpaused Chromium comparison checks applied entry/completion and cancellation on reopening; a combined PHP-minified production probe checks real actions, controlled release, dismissal/recovery, font loads and older controllers.

Run `npm run build && npm test` in Assets/components. Reference CSS is a tracked generated Tailwind fixture. Regenerate via `npx @tailwindcss/cli -i tests/reference/suggestion-banner.css -o tests/reference/suggestion-banner.generated.css`. Source hash is in sources-suggestion-banner.json. Production has no React/Motion/Lucide runtime dependency.

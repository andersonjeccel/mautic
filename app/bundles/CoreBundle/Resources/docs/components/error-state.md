# ErrorState

Independent CoreBundle port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/error-state.tsx`.

```twig
{% include '@MauticCore/Components/error-state.html.twig' with {
    title: 'Generation failed',
    message: 'Your prompt is preserved.',
    retryLabel: 'Try again',
    variant: 'Card',
    className: 'generation-error'
} only %}
```

`Card` is the default; `Inline` shows the compact alert. Title, message and retryLabel retain empty/zero strings and escaped user content. The role is alert. The retry button has type=button, respects native disabled/keyboard behavior, and uses the exact source Lucide SVG paths, with attribution in lucide-ISC.txt.

```javascript
const element = document.querySelector('[data-component="error-state"]');
const error = window.MauticUI.ErrorState.get(element);
error.update({onRetry: () => restartGeneration()});
error.update({retrying: true});
error.update({retrying: undefined});
element.addEventListener('mautic:error-state:retry', () => {});
```

`update()` accepts title, message, retryLabel, retrying, variant, className and onRetry. Omitted/undefined retrying uses internal state; false is explicitly controlled and keeps the button enabled after clicks. Every accepted click updates internal state and queues its own 1600ms reset, even while controlled. Removing control exposes that state. Pending retries are not debounced: an earlier timer can clear busy while a later one is pending, exactly as in the reference. The callback sees the pre-render button state, matching React event batching. Timers and the handler are disposed on removal.

The Card spinner label is Retrying plus the source ellipsis, while Inline retains retryLabel. Switching variants does not reset internal retry state; an initially hidden message and custom label remain available. Same busy-state renders preserve the existing SVG spinner node.

## Motion fidelity

Spinner rotation is an 800ms linear CSS loop and is not disabled by reduced motion because the source does not disable it. Card disabled opacity transitions over 160ms; its individual active scale is immediate because the original transition list excludes scale. Inline active scale follows the source 150ms transition-transform list including individual scale. Focus rings, radius variables, light/dark colors, shadows, wrapping and native form behavior match the reference.

## Checks

24 browser tests passed, with 295 temporal comparisons across 16 theme/motion/viewport/variant configurations plus real pointer press/release/focus and label/variant updates. Exact geometry, transforms, individual scale, opacity, text, paths and disabled state match the byte-preserved React fixture. Pixels have no differences above threshold 0.05. Tests cover 1599/1600ms timing, controlled false, queued timers, control release, callback ordering, Enter/Space without submit, controlled-disabled clicks, custom/empty labels, hidden-message preservation and pending timer cleanup.

Trajectory sampling uses Chromium --disable-threaded-animation, paused CSS animations and explicit times. A separate normal unpaused Chromium probe runs actual retry/spinner/completion with PHP-minified combined assets. Production depends only on its TypeScript and local lifecycle helper; React, Motion and Lucide are fixture-only dependencies.

Run `npm run build && npm test` in Assets/components; CI generates reference Tailwind CSS. Source hashes are in sources-error-state.json.

# ChatEmptyState

Standalone port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/chat-empty-state.tsx`.

```twig
{% include '@MauticCore/Components/chat-empty-state.html.twig' with {
    title: 'What do you want to know?',
    subtitle: 'Ask a question, or start from one of these.',
    prompts: [{id:'summary',label:'Summarize',prompt:'Summarize the current page'}],
    variant: 'Default',
    className: 'assistant-empty'
} only %}
```

All props are optional. Default title/subtitle pass through Twig translation, and only undefined restores defaults; empty/null strings remain empty, string zero remains visible. prompts defaults to []. Each SuggestedPrompt has unique string id, label and optional prompt string. Plain title/subtitle/labels stay escaped. Default is left aligned; Centered uses the source flex column/centered heading and wrapping prompt layout, with the same 520px width ceiling and Sparkles vector.

```javascript
const element = document.querySelector('[data-component="chat-empty-state"]');
const empty = window.MauticUI.ChatEmptyState.get(element);
empty.update({prompts, onSelectPrompt: prompt => selectPrompt(prompt)});
empty.update({variant: 'Centered'});
empty.update({onSelectPrompt: undefined});
```

update supports title/subtitle/prompts/variant/className/onSelectPrompt. Clicking passes the exact current prompt object to onSelectPrompt, with optional prompt and extra fields unchanged; it also emits bubbling mautic:chat-empty-state:select with {prompt}. Without a callback the buttons remain enabled and no local selection state is invented. Function callbacks are runtime configuration, not serialized in Twig. Rebind callbacks when obtaining a newly mounted controller. Native type=button, keyboard/forms and source focus/forced-colors behavior are preserved. Disposal removes delegation; remount replaces stale prompt container with a fresh tree from server configuration.

## Motion fidelity

Prompt entry is opacity 0 to 1 and translateY(6px) to none over 240ms cubic-bezier(0.23,1,0.32,1), fill both. Delay is min(index,5)*50ms, capped at 250ms. Reduced motion removes only the entry animation. Root variant changes preserve keyed prompt nodes and entry tracks. Empty/nonempty transitions unmount/remount the prompt container. Keyed host moves follow React lastPlacedIndex behavior; a physical host move can restart its CSSAnimation despite preserved element identity, and the tests compare this against the source rather than assuming track identity survives every reorder.

Hover color/border/transform use the exact 150ms source transition-property list. Hover background and individual active scale(0.96) are instantaneous because that list does not contain background-color/scale. Pointer-up reversal, native focus ring, light/dark opacity colors, fonts, geometry and SVG paths/strokes match. Unchanged heading/subtitle/label text hosts are preserved, retaining selected text on metadata updates. Keyframes are scoped to avoid source su-msg-in name collisions between native components.

## Verification

30 standalone and 30 integrated browser tests passed; 236 exact temporal/pixel frames across 16 theme/motion/viewport/variant configurations, plus title/subtitle empty/null/zero/default, absent/empty prompts, empty labels, escaping, callback payload/object identity and removal of callback, keyed reorder/delay/variant identity, list remount, hover/press/release, focus/forced colors, keyboard/no-submit, text selection and disposal/remount. No differences above Pixelmatch threshold 0.05; geometry, colors, border/radius, opacity, transforms/scale, text, vector paths/strokes and ARIA match.

The deterministic harness uses Chromium --disable-threaded-animation and separates CSSAnimation/CSSTransition times. Normal unpaused original/native Chromium validates actual entry duration/delay caps, settled opacity/transform, retained variant track, original object callbacks and empty-list remount in both motion preferences. Combined PHP-minified assets run with earlier controllers, real HTTP font requests and no browser errors.

Run npm run build and npm test in Assets/components. Regenerate reference CSS with `npx @tailwindcss/cli -i tests/reference/chat-empty-state.css -o tests/reference/chat-empty-state.generated.css`. sources-chat-empty-state.json pins original source hash. Production inputs are lifecycle.ts and chat-empty-state.ts only, without React/Motion/Lucide runtime imports. Lucide ISC license is included.

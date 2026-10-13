# DiffView

Standalone CoreBundle port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/diff-view.tsx`.

```twig
{% include '@MauticCore/Components/diff-view.html.twig' with {
    diffs: [{id:'config',path:'config.ts',additions:1,deletions:0,lines:[{type:'add',text:'enabled = true'}]}],
    variant: 'Default',
    className: 'assistant-diffs'
} only %}
```

diffs is required. Each FileDiff has unique string id, path, additions/deletions numbers and lines array; DiffLine type is context/add/remove with text string. Default includes the horizontal-scroll body; Summary omits it but retains the source header bottom border. Undefined variant restores Default. Labels, paths and code stay escaped, including literal replacement tokens. Accept/Reject path label patterns and accepted/rejected words pass through Twig translation; numeric counters retain the source plus and Unicode minus signs.

```javascript
const element = document.querySelector('[data-component="diff-view"]');
const view = window.MauticUI.DiffView.get(element);
view.update({onAccept: id => acceptFile(id), onReject: id => rejectFile(id)});
view.update({diffs: updatedDiffs, variant: 'Summary'});
```

update accepts diffs/variant/className/onAccept/onReject. Decisions are local and not controlled props; accepted/rejected replaces the two actions with a status badge. Decisions persist through missing/restored ids, new arrays, path changes, reorder and variants. Callbacks receive the exact id after internal state changes but before DOM commit, matching source React batching. Root events mautic:diff-view:accepted/rejected bubble with {id}. Missing callbacks do not disable buttons or prevent local decisions. Function callbacks are client configuration, not Twig serialization. Rebind them when obtaining a fresh controller after remount; root event listeners can remain. Removal disposes delegation; remount resets decisions and rebuilds from original server props.

## DOM and motion fidelity

Keyed card host placement matches React lastPlacedIndex. Lines are indexed, retaining their sign/text nodes across type/content updates. Empty text removes the text host. Horizontal overflow and whitespace-nowrap retain the original source whitespace collapsing rather than inventing preformatted code behavior. Signs are aria-hidden with source select-none/opacity. Counter sign/number and inter-counter space are distinct text nodes for exact monospace shaping. Unchanged path/badge/text hosts retain selection and pop track on metadata updates.

The decision badge pops opacity 0/scale(0.85) to 1/none over 200ms cubic-bezier(0.23,1,0.32,1), motion-safe only. Rejection independently fades the entire card to 0.45 opacity over 200ms cubic-bezier(0.4,0,0.2,1). Reduced motion removes badge pop but keeps source card fade. Card removal/restoration keeps its decision, but remounts the badge and can replay its entry.

Reject hover transitions literal color/background-color/transform for 150ms; its individual active scale(0.9) is immediate. Accept uses Tailwind transition-transform, including individual translate/scale/rotate, for 160ms cubic-bezier(0.23,1,0.32,1), so its active scale is transitioned. Hover is guarded by (hover:hover). Native type=button, exact ARIA labels, keyboard/form and forced-colors focus ring behavior match. FileCode2/Check/X paths/strokes and ISC license are included, with source light/dark line backgrounds/foreground colors and scoped pop keyframes.

The native decision record intentionally retains ordinary-object lookup semantics. The source constructor function id case renders an empty decided badge without controls; the port does not silently normalize that identifier or change source behavior.

## Verification

27 standalone and 27 integrated browser tests passed. 264 exact temporal/pixel comparisons cover 16 theme/motion/viewport/variant configurations, accepted pop/rejected pop and card fade, callback precommit button counts, retained ids/variants/reorder, badge/animation identity and path selection, indexed line/type/text/scroll state, literal paths/empty/zero counters and absent callbacks, source prototype-function lookup, hover/press/release/focus, native keyboard/no-submit/disposal/remount and forced colors. No differing pixels above threshold 0.05; geometry, borders/colors/radius, opacity/transform/scale, text, SVG paths/strokes and ARIA match React.

Normal unpaused original/native Chromium verifies real 200ms pop/fade timelines and settlement, retained rejection through removal/restoration and Summary body omission in both motion preferences. Combined PHP-minified assets run with earlier components and actual HTTP font requests, without browser errors. Production contains lifecycle.ts/diff-view.ts only, without React/Motion/Lucide runtime imports.

Run npm run build and npm test in Assets/components. Regenerate reference CSS using `npx @tailwindcss/cli -i tests/reference/diff-view.css -o tests/reference/diff-view.generated.css`. sources-diff-view.json records source hash; source font bytes and vector license are included.

# ToolChips

Standalone CoreBundle port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/tool-chips.tsx`.

```twig
{% include '@MauticCore/Components/tool-chips.html.twig' with {
    calls: [{id:'fetch',name:'fetch_records',status:'running',args:{query:'carriers'},result:'Found carriers',startedAt:1}],
    variant: 'Row',
    className: 'assistant-tools'
} only %}
```

calls is required; use unique string ids. Each call accepts the source ToolCall fields: id/name/status, optional description/content/args/result/startedAt/completedAt/children/parallel. Only the original displayed fields are rendered. variant defaults to Row and also supports Stack. The native controller formats arguments with JSON.stringify and elapsed seconds with JavaScript toFixed(1); zero/missing timestamps suppress duration exactly as in the source. In PHP, use stdClass/(object)[] for an empty args dictionary; [] remains a JSON array. The reference Twig harness preserves JSON objects inside calls instead of losing empty objects to associative decoding.

```javascript
const element = document.querySelector('[data-component="tool-chips"]');
const chips = window.MauticUI.ToolChips.get(element);
chips.update({calls: updatedCalls});
chips.update({variant: 'Stack'});
element.addEventListener('mautic:tool-chips:toggle', event => console.log(event.detail.openId));
```

update accepts calls, variant and className; unspecified props remain unchanged, undefined optional props restore defaults. Clicking the current id closes it; choosing another replaces selection. There is no controlled openId prop in the source. Selection remains stored when its call disappears, so restoring that id reopens its result. An empty result suppresses the panel without clearing aria-expanded. String zero is a real visible result. JSON/name/result text is escaped. Both variants preserve native type=button, Enter/Space, focus and expanded ARIA. Removing the component disposes delegation; remount resets local selection and reapplies server configuration without duplicating stale chips.

## Motion fidelity

Running dots use the source 2s pulse (opacity 1 to 0.5) and cubic-bezier(0.4,0,0.6,1), suppressed only under reduced motion. Existing keyed dots retain their tracks during unchanged updates. Grid-template-rows transitions over 240ms cubic-bezier(0.32,0.72,0,1). Closing removes result content immediately, so no extra exit retention/fade is added. Hover/active borders/backgrounds retain 150ms source easing; individual active scale is immediate because the explicit transform transition does not include scale. Those transitions remain active under reduced motion.

Keyed host placement reproduces React lastPlacedIndex behavior, not a different minimal-move algorithm: which node moves can affect CSS transitions and focus despite identical final order. Updating the same selected id changes its existing panel/argument/result nodes rather than restarting its selection. Force-colors focus follows the original outline.

## Checks

30 browser tests passed, with 375 exact temporal comparisons, including 16 light/dark/motion/viewport/Row/Stack configurations, pulse phases, intermediate grid growth, immediate close, status changes, duration rounding/zero/negative values, JSON integer-key order and empty object, id reorder/removal/restoration, stable pulse identity, hover/press/focus, forced colors, keyboard/no submit and removal/remount. Geometry, colors, borders, text, scale/translate/transforms, grid tracks, opacity and ARIA match; pixels have no differences above threshold 0.05.

Sampling uses Chromium --disable-threaded-animation and separate CSSAnimation/CSSTransition times. A normal unpaused original/native probe verifies pulse, real grid expansion, selection reorder, empty JSON object and immediate closing in reduced/no-preference modes. Combined PHP-minified assets are exercised in normal Chromium alongside earlier controllers and actual font loads.

Run `npm run build && npm test` in Assets/components. Reference CSS is a tracked generated Tailwind fixture; regenerate with `npx @tailwindcss/cli -i tests/reference/tool-chips.css -o tests/reference/tool-chips.generated.css`. Hash is in sources-tool-chips.json. Production inputs are local tool-chips.ts and lifecycle.ts only, without React/Motion runtime dependencies.

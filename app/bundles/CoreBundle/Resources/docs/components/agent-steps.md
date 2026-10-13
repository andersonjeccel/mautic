# AgentSteps

Standalone CoreBundle port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/agent-steps.tsx`.

```twig
{% include '@MauticCore/Components/agent-steps.html.twig' with {
    steps: [{id:'inspect',name:'inspect_document',status:'running',args:{path:'document'},result:'Result'}],
    variant: 'Default',
    className: 'assistant-steps'
} only %}
```

steps is required. Each ToolCall has id/name/status (pending, running, success, error, cancelled), optional description/content/args/result/startedAt/completedAt/children/parallel. Children show only their status dot, name, parallel label and result, not a recursive full timeline. Default includes details/args/expandable output; Compact suppresses them without clearing each retained row's local open state. A removed/readded id remounts with open=false. Multiple rows may be independently open. Nonexpandable buttons remain enabled/focusable, have no aria-expanded and do not toggle; all buttons preserve source type=button/no-submit behavior.

```javascript
const element = document.querySelector('[data-component="agent-steps"]');
window.MauticUI.AgentSteps.get(element).update({steps, variant: 'Compact'});
```

update accepts all source props; undefined variant restores Default. Output is expandable only when noncompact and Boolean(result || content || children.length). Preserve React content truthiness: true/empty arrays create empty content wrappers, false/null omit them, numeric zero renders bare text when other output makes the grid exist, and string zero is real content. Plain HTML-looking strings are literal escaped text. JS content accepts Node or arrays/scalars; stable content identity retains input state through collapse and unrelated metadata updates. For trusted captured Twig Markup pass step.richContent=true to hydrate the template slot; do not mark untrusted input as raw. Collapsed content stays mounted/focusable, matching the source.

Duration omits falsy start/end values including timestamp zero; otherwise it uses exact JS ((completedAt-startedAt)/1000).toFixed(1)+'s', including negative/nonfinite results. Args use JSON.stringify, preserving empty objects, nested shapes and property order; the fixture PHP serializer preserves stdClass under steps. Results retain source whitespace, max-height 320px and native scrolling/wrapping. Child grid changes at the source 40rem breakpoint. Fixed status/parallel strings pass through Twig translation. Keyed main/child hosts use React lastPlacedIndex placement. Success/error preserve the same pop span and animation when exchanging SVG types; pending/dot/terminal switches replace their source host types.

## Animations and validation

Terminal pop is 200ms cubic-bezier(0.23,1,0.32,1), from scale .85/opacity zero to normal. Running dot pulses for 2s cubic-bezier(.4,0,.6,1) to opacity .5 halfway. Both are motion-safe only, including nested running child dots. Grid rows transition 0fr/1fr for 240ms cubic-bezier(.32,.72,0,1), chevron rotate 180deg for 200ms cubic-bezier(.23,1,.32,1), and expandable button active scale .995 for 150ms using the source transition-transform property set. Grid/chevron/press transitions remain active under reduced motion as in the source.

35 standalone tests passed with 256 exact computed-style/geometry/text/ARIA and pixel frames at threshold 0.05 and no differing pixels. Coverage includes all five statuses, 16 theme/motion/viewport/variant configurations, independent open state, partial updates, keyed reorder/removal/restoration, preserved terminal animation identity, touch/keyboard/forms/forced colors, args empty objects, falsy/negative/nonfinite duration, literal/boolean/array/zero content, actual rich input retention, trusted server Markup versus escaped strings, empty lists and disposal/remount. Intermediate opacity values are asserted; expansion/reversal and press trajectories are sampled, not only final states.

Deterministic Chromium uses --disable-threaded-animation and seeks CSS tracks; completed transitions finish and release their effects before capture. A shared frame is advanced after touch release so final glyph rasterization has been submitted. Separate normal original/native Chromium verifies real unpaused motion-safe pulse, terminal pop, expansion and collapse in both preferences. Integration/PHP-minified combined execution evidence is recorded in the external component report. Production has no React or Motion runtime dependency.

Run npm run build and npm test in Assets/components. Regenerate reference CSS with `npx @tailwindcss/cli -i tests/reference/agent-steps.css -o tests/reference/agent-steps.generated.css`. sources-agent-steps.json pins original source bytes and source fonts are included.

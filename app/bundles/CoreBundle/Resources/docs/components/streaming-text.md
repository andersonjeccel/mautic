# StreamingText

Standalone CoreBundle port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/streaming-text.tsx`.

```twig
{% include '@MauticCore/Components/streaming-text.html.twig' with {
    text: 'Before **bold** after [1].',
    streaming: true,
    citations: [{id:'source-1',index:1,title:'Shipping report',url:'https://example.com/report'}],
    followUps: [{id:'followup-1',label:'Explain the impact',prompt:'Describe the full impact.'}],
    variant: 'Sources',
    className: 'assistant-answer'
} only %}
```

text is required. streaming defaults to false, citations/followUps to empty arrays, and variant to Answer. Sources shows citation titles and hostname; Answer shows at most three overlapping badges and the total source count. URL parsing follows new URL(url).hostname only in visible Sources; the component does not create links or fetch URLs. Invalid URLs are not evaluated in Answer or while streaming. Citation properties are id/index/title/url with optional snippet/favicon; SuggestedPrompt is id/label with optional prompt. Use unique string ids for React-compatible keyed lists.

```javascript
const element = document.querySelector('[data-component="streaming-text"]');
const answer = window.MauticUI.StreamingText.get(element);
answer.update({text: 'Another **token** [2]'});
answer.update({streaming: false});
answer.update({onFollowUp: prompt => sendPrompt(prompt.prompt ?? prompt.label)});
element.addEventListener('mautic:streaming-text:followup', event => {});
```

update accepts every source prop. Omitted props remain unchanged; undefined streaming/citations/followUps/variant/className restore defaults. text remains required. Follow-up callback and event detail receive the exact latest prompt object, including any extra fields; no object is reconstructed from button labels. The buttons use type=button and native keyboard/focus. Removal disposes delegation.

The parser reproduces the source split/filter and per-token prefix/suffix tests, not a general Markdown renderer: bold, decimal-ASCII bracket references and plain spans retain keyed-by-position DOM semantics. This includes malformed-star strings that the source subsequently classifies as strong. HTML remains escaped text. Paragraph gets aria-hidden=true while streaming, caret and answer badge group are aria-hidden, and footers are absent while streaming.

## Motion fidelity

Caret uses the source 1s steps(1,end) keyframes, switching off at 500ms and on at the loop boundary; reduced motion disables it. Text updates preserve the caret node and animation phase. Completion adds a 240ms opacity/translateY(6px) citation entry and keyed follow-up entries delayed by min(index,4)*50ms. Reduced motion suppresses those entries, but preserves the original hover/press transitions. Text/class/variant updates retain active tracks when the source does; keyed lists preserve ids on reorder and reset when removed by streaming. Inline strong/reference styles, URL hostnames, overlapping badge geometry, SVG vector and stroke widths match the reference.

Follow-up button scale and group-hover arrow translate are immediate because the explicit source color/transform transition list does not include individual scale/translate. Colors animate with their original 150ms easing curves. Source last:border-b-0 matches every button because each is its parent's last child; no separator is invented. Forced-colors focus matches the source outline. CornerDownLeft vector attribution is in lucide-ISC.txt.

## Checks

32 browser tests passed, with 407 exact temporal comparisons across 16 theme/motion/viewport/variant configurations, parser updates, keyed lists/reorders/variant toggles, caret track identity, six staggered follow-ups, hover/press/focus, latest object callback identity, native keyboard/no submit, cleanup, lazy URL evaluation and forced colors. Geometry, text, colors, borders, scale/translate/transforms, opacity, paths and ARIA match. Pixels have no differences above threshold 0.05.

Trajectory sampling uses Chromium --disable-threaded-animation and explicit paused CSS times. CSSAnimation entry times and CSSTransition hover times are sampled separately so settled entries cannot conceal intermediate hover colors. Inactive manually retained CSSAnimation objects are canceled only in the sampling harness. A normal unpaused original/native probe separately checks cursor blinking, completion/stagger, phase-preserving text updates and reduced motion; combined PHP-minified assets are exercised with actual fonts and controllers.

Run `npm run build && npm test` in Assets/components. Reference CSS is a tracked generated Tailwind fixture; regenerate with `npx @tailwindcss/cli -i tests/reference/streaming-text.css -o tests/reference/streaming-text.generated.css`. Source hash is in sources-streaming-text.json. Production inputs are only local streaming-text.ts and lifecycle.ts; no React/Motion/Lucide runtime dependency.

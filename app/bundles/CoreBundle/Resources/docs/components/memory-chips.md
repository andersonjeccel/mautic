# MemoryChips

Standalone CoreBundle port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/memory-chips.tsx`.

```twig
{% include '@MauticCore/Components/memory-chips.html.twig' with {
    memories: [{id:'locale',fact:'Uses Mautic'}],
    title: 'Assistant memory',
    variant: 'Panel',
    onAdd: true,
    className: 'assistant-memory'
} only %}
```

memories is required, each item has unique string id and fact. Optional title defaults to translated Assistant memory only when undefined; empty/null titles stay empty, string zero stays visible. Panel is the default, with heading/count and empty-state paragraph. Row omits the heading/count and always renders the list, including Add when requested. An empty Panel does not render Add, matching the source. All fixed UI strings and Forget label pattern pass through Twig translation. Plain facts remain text, including HTML characters, literal replacement tokens and quotes.

```javascript
const element = document.querySelector('[data-component="memory-chips"]');
const chips = window.MauticUI.MemoryChips.get(element);
chips.update({onRemove: id => forgetMemory(id), onAdd: () => addMemory()});
chips.update({memories: updatedMemories, variant: 'Row'});
chips.update({onAdd: undefined});
```

update accepts memories/title/variant/className/onRemove/onAdd. Twig onAdd is a visibility bridge, not executable callback serialization. Client onAdd is a function; clearing it hides Add. The component also emits bubbling mautic:memory-chips:remove with {id} and mautic:memory-chips:add. Removal is local: its Set of ids persists through new prop arrays, vanished/restored memories, title changes and variants. User onRemove runs after marking the id but before DOM commit, like source React event batching; count observations inside the callback still see the original list. Buttons have type=button, exact Forget fact ARIA labels, native keyboard/form behavior, pointer hover/press and focus rings. Disposal removes delegation; remount clears local removed state and rebuilds from server props. Rebind function callbacks to a new controller after remount; element-level event listeners can remain on the root.

## Motion and DOM fidelity

Each keyed li enters with opacity 0 to 1 and translateY(4px) to none, 240ms cubic-bezier(0.23,1,0.32,1), fill both, with delay min(index,5)*40ms. Reduced motion removes the entry track only. Existing keyed nodes and CSSAnimation tracks survive metadata/reorder/delay updates; React lastPlacedIndex host placement is reproduced. Switching Panel/Row remounts the list and replays entry, as the source child positions do. Empty/nonempty Panel changes similarly replace list/paragraph. Removal is immediate, without an invented exit animation.

Literal source transition-[color,background-color,transform] and transition-[color,border-color,transform] lists are retained at 150ms. Source active scale uses the individual scale property and is instantaneous, because those lists do not include scale. Remove scale is 0.85; Add scale is 0.96. Light/dark colors, borders, panel shadow/radius, wrapping, SVG vectors/strokes and font bytes match the source.

Count number and saved suffix retain separate text nodes to match browser shaping/rounding; unchanged title/count/fact hosts preserve selection. Empty fact removes the text host rather than leaving an empty text node. Source Lucide Brain/Plus/X vectors and ISC license are included.

## Verification

32 standalone browser tests and 32 integration tests passed. 342 exact temporal/pixel comparisons cover 16 theme/motion/viewport/variant configurations, capped stagger, removal/reindexing, callback order, retained ids, variant/list remounts, existing animation identity, empty/title/zero/null/escaping/literal label cases, text selection and empty-text-host topology, hover/press/release, focus, keyboard/forms and disposal/remount. No differing pixels above Pixelmatch threshold 0.05; geometry, colors, border/radius, opacity, transforms/scale, text, SVG paths/strokes and ARIA match.

The harness samples normal CSSAnimation and CSSTransition timelines separately with Chromium --disable-threaded-animation. Normal unpaused Chromium validates original/native actual 240ms entry, capped 200ms delays, animation settlement, metadata identity, removal persistence, variants, empty states and Add in normal/reduced motion. PHP-minified concatenated assets execute beside earlier components, with actual HTTP font requests and no browser errors.

Run npm run build and npm test in Assets/components. Regenerate the tracked reference stylesheet with `npx @tailwindcss/cli -i tests/reference/memory-chips.css -o tests/reference/memory-chips.generated.css`. sources-memory-chips.json pins source hash. Production has only lifecycle.ts/memory-chips.ts, no React/Motion/Lucide runtime imports.

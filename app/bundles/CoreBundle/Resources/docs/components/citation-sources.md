# CitationSources

Standalone CoreBundle port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/citation-sources.tsx`.

```twig
{% include '@MauticCore/Components/citation-sources.html.twig' with {
    text: 'An answer [1].',
    citations: [{id:'source',index:1,url:'https://example.com/path',title:'Source title',snippet:'Details'}],
    variant: 'Inline',
    className: 'assistant-citations'
} only %}
```

text/citations are required. Citation fields are id/index/url/title with optional snippet/favicon; favicon is ignored exactly as the source. Inline is default; Footnotes additionally lists every citation in original order. Text splits on bracketed ASCII digits only, drops empty split pieces, looks up Number(index) and preserves unknown/invalid bracket tokens as plain text. Repeated/leading-zero markers are resolved by numeric index; duplicate citation indices use the last entry for markers without deduplicating footnotes. URLs use the actual browser new URL(...).hostname semantics, including ports, IDN/punycode and IPv6. URLs must be absolute valid URL strings where rendered; do not invent a fallback for source URL parser errors.

```javascript
const element = document.querySelector('[data-component="citation-sources"]');
const sources = window.MauticUI.CitationSources.get(element);
sources.update({text: updatedText, citations, variant: 'Footnotes'});
sources.update({variant: undefined});
```

update supports text/citations/variant/className. Markers use split-piece position identity as React index keys; changing plain part to marker or vice versa remounts its host, while metadata updates keep marker focus and unchanged text nodes. Footnotes are keyed by citation id and use React lastPlacedIndex host placement. Clearing citations reverts unmatched markers to escaped original tokens. Empty Footnotes still includes its source border/padding. Plain text/metadata/ARIA labels are escaped and literal replacement tokens in titles remain literal. Fixed Source label pattern passes through Twig translation. No callback, link/navigation, fetched favicon, selected state or dismissal behavior is invented: marker buttons only expose tooltips on hover/focus.

## Tooltip and accessibility fidelity

Marker buttons use source type=button and literal Source index/title ARIA labels. Tooltip role stays in the DOM even at opacity zero, with pointer-events:none; no extra aria-hidden, aria-describedby or hidden attribute is introduced. Keyboard focus-within opens it and blur closes it. Source focus ring, native form/no-submit behavior and forced colors match. Hover rules require (hover:hover); touch/no-hover capability is tested separately.

Tooltip opacity transitions 140ms cubic-bezier(0.23,1,0.32,1), with source bottom/center positioning, 240px width, shadow, typography and snippet wrapping. Individual scale changes 0.97 to 1 immediately: the literal transition-[opacity,transform,filter] list does not include scale. The pinned source Tailwind version does not generate blur-0, so its visible tooltip keeps blur(2px); the native implementation reproduces the actual compiled behavior instead of adding a blur-clear animation. This is measured in computed styles and pixels. Marker active scale(0.9) is also immediate; background/color transitions take 150ms. Both preferences keep these source transitions. Rounded marker/footnote corners are the source 0.25rem, not custom rounded-sm tokens.

## Verification

28 standalone and 28 integrated browser tests passed. 209 exact temporal/pixel comparisons cover 16 theme/motion/viewport/variant configurations plus touch/no-hover in both themes: hover/close/reverse/focus/press, opacity/filter/scale/translate/shadow trajectories, keyboard/no-submit/forced colors, repeated/leading-zero/unknown/non-ASCII bracket parsing, duplicate index resolution, absent/empty snippet, literal ARIA placeholders and Unicode/IPv6/port hostname handling, positional marker and keyed footnote updates, selection, empty citation fallback and disposal/remount. No differing pixels above threshold 0.05; geometry, colors/borders/radius, opacity/filter/shadows/transforms, text and ARIA match React.

Normal unpaused original/native Chromium validates real focus opening/closing and source-visible blur, Footnotes/hostname and marker fallback in both motion preferences. Combined PHP-minified assets run with earlier controllers, real HTTP font requests and no browser errors. Production includes lifecycle.ts/citation-sources.ts only, without React/Motion runtime imports.

Run npm run build and npm test in Assets/components. Regenerate reference CSS using `npx @tailwindcss/cli -i tests/reference/citation-sources.css -o tests/reference/citation-sources.generated.css`. sources-citation-sources.json pins source hash and source font bytes are included.

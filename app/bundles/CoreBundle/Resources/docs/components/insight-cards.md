# InsightCards

Standalone CoreBundle port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/insight-cards.tsx`.

```twig
{% include '@MauticCore/Components/insight-cards.html.twig' with {
    insights: [{id:'views',label:'Views',value:'1,240',change:12.3,spark:[12,40,80,100],note:'More visits'}],
    variant: 'Grid',
    className: 'assistant-insights'
} only %}
```

insights is required; each Insight has unique string id, label/value strings, optional numeric change, spark number array and note string. Props contain all user-facing labels, with no invented fixed text. Plain strings stay escaped and empty/zero strings are preserved. Grid is default, with one column below the source 40rem breakpoint and two columns at/above it; Row is a flex column. Width ceiling is 520px and gap 10px. An undefined variant restores Grid. No extra role, callback or interactive control is introduced.

```javascript
const element = document.querySelector('[data-component="insight-cards"]');
const cards = window.MauticUI.InsightCards.get(element);
cards.update({insights: updatedInsights, variant: 'Row'});
```

update supports insights/variant/className. Cards are keyed by id; bars are keyed by their index, matching the source. Metadata updates retain existing card/bar/text nodes. Last-index bar highlighting follows current array length. Missing/empty spark removes the chart; restoration creates fresh bars and replays growth. Empty insights removes cards and restoration remounts. Native lifecycle drops the controller on removal; remount rebuilds the tree from initial server configuration.

## Trend and text semantics

Only undefined change removes the trend; zero and negative zero render +0%, positive change renders plus/TrendingUp, negative change renders TrendingDown without plus. Source null renders +% with no numeric text host. Numeric/string/sign/suffix text-node boundaries are retained for exact monospace shaping; sign changes replace the SVG component type without replacing the trend paragraph. JavaScript nonfinite values preserve source NaN/Infinity rendering and sign selection. Plain note string zero is real content, empty note is omitted. Notes remain direct text beside a decorative Sparkles SVG, retaining source flex wrapping/border geometry. Labels/values preserve unchanged text hosts and selection.

## Motion fidelity

Spark height is Math.max(12, Math.min(100, point)) percent of a 32px parent. The source invalid NaN% CSS setter behavior is preserved rather than substituting a height; Infinity clamps normally. Bars are 3px wide with 2px gaps, origin-bottom, source rounded corners and final-bar colors. Each enters from opacity 0.4/scaleY(0.2) to opacity 1/none over 400ms cubic-bezier(0.23,1,0.32,1), fill both, delay index*30ms without a cap.

Existing bar height transitions take 500ms with the same easing. CSSAnimation and CSSTransition can run simultaneously; native updates preserve the growth track while changing height. Reduced motion suppresses growth only, not height/border transitions. Card border hover uses the exact 150ms source transition and (hover:hover) guard. Keyed root placement follows React lastPlacedIndex; physical moves can restart CSS animations as in the source. Sparkles/TrendingUp/TrendingDown vectors and ISC license are included, with scoped grow keyframes.

## Verification

31 standalone and 31 integrated browser tests passed. 309 exact temporal/pixel comparisons cover 16 theme/motion/viewport/variant configurations, separate growth/height trajectories, indexed bar identity and length/highlight changes, conditional chart/card removal and restoration, Grid/Row and 639/640/641px breakpoint edges, trends across sign/undefined/null/zero/negative-zero/decimals/nonfinite values, CSS rejected heights, escaped/empty strings, hover/reversal, text selection and disposal/remount. No pixel differences above Pixelmatch threshold 0.05; geometry, colors/borders/radius, opacity/transforms/scale, chart tracks, text, SVG paths/strokes and ARIA match React.

Normal unpaused original/native Chromium verifies actual 400ms entry plus uncapped delays, preserved growth CSSAnimation during real 500ms height transitions, settlement at full height and negative trend in both motion preferences. Capture all current transitions before awaiting their completion: finished CSSTransitions disappear from later getAnimations calls. Combined PHP-minified assets run with earlier components, real HTTP font requests and no browser errors.

Run npm run build and npm test in Assets/components. Regenerate reference CSS using `npx @tailwindcss/cli -i tests/reference/insight-cards.css -o tests/reference/insight-cards.generated.css`. sources-insight-cards.json pins source hash. Production inputs are lifecycle.ts/insight-cards.ts, without React/Motion/Lucide runtime imports. Font bytes and icon license are included.

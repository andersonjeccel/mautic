# AgentPlan

Native CoreBundle port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/agent-plan.tsx`.

```twig
{% include '@MauticCore/Components/agent-plan.html.twig' with {
    steps: [{id:'inspect',title:'Inspect document',detail:'Collect relevant notes'}],
    title: 'Proposed plan',
    runLabel: 'Run plan',
    variant: 'Default',
    className: 'assistant-plan'
} only %}
```

steps is required. A step has id/title and optional detail. Default shows details; Compact omits them. Undefined title/runLabel/variant restore translated source defaults, while empty labels remain empty. The grip is decorative: the source has no drag/reorder handler, so none is invented. Group click toggles its step; Checkbox click stops propagation and toggles exactly once. Space toggles the checkbox, Enter does not; the run button has type=button and never submits its enclosing form.

```javascript
const element = document.querySelector('[data-component="agent-plan"]');
const plan = window.MauticUI.AgentPlan.get(element);
plan.update({steps, variant: 'Compact', onRun: enabledStepIds => run(enabledStepIds)});
element.addEventListener('mautic:agent-plan:run', event => run(event.detail.enabledStepIds));
```

Use either onRun or the native integration event, not both for the same action. update supports all source props. Disabled ids persist through steps/metadata/variant updates and removal/readdition, exactly as source useState(Set). The caption is literally steps.length - disabled.size: stale disabled ids can produce a negative count; only count exactly zero disables Run. Callback ids are computed independently from current steps, preserving current order. Keyed rows retain source lastPlacedIndex host placement/focus; removed rows remount their checkbox if readded. Counter number/slash/number/suffix text nodes match JSX boundaries and unchanged text hosts retain selection. Literal title placeholders and HTML-looking strings stay escaped. Fixed title/run/count/Ativar label patterns use Twig translation.

## Checkbox dependency and animations

The component bundles the existing native AnimatedCheckbox controller and includes its Twig/CSS dependency, not React. Its registration is guarded so the combined legacy asset list can also load 99.animated-checkbox.js without duplicate handlers/controllers. Outside forms the unused hidden checkbox input is removed after controller initialization; form instances retain it and preserve their initial per-row reset state, including newly remounted initially-off rows. Indicator SVG matches the source's lack of aria-hidden, while Lucide grip/arrow SVGs retain it.

Checkbox hover/press use the original spring stiffness 550/damping 30/restSpeed 10 and scale 1.05/0.95. Stroke/opacity retain 200ms draw duration and checked 200ms delay, including interrupted redraw. Row background, disabled opacity and grip opacity transition for 150ms; detail text/strikethrough/spacing match source. Run opacity transitions for 160ms cubic-bezier(0.23,1,0.32,1); its individual active scale 0.98 changes immediately because the source literal transform/opacity transition excludes scale. Arrow translate animates 0 to 2px for 180ms with the same easing. All hover selectors require hover capability. Reduced motion retains the measured source behavior. Compact class updates occur on the actual row host, matching source hover hit-testing during layout changes.

## Verification

31 standalone browser tests passed with 484 reference/native frame comparisons at Pixelmatch threshold 0.05 and no differing pixels in the tested scenes. Coverage includes 16 theme/motion/viewport/variant combinations, four actual spring/draw/interruption configurations, touch/no-hover, keyboard/forced colors, form reset and stopped bubbling/no-submit, callback ids, negative/stale-id counts, default/empty/literal/zero metadata, keyed focus, counter selection and disposal/remount.

The animation sampler preserves WAAPI start origins against a shared frame clock, aligns gesture event timestamps and disables threaded animation for deterministic screenshots. Geometry and stroke/opacity are recorded to four decimal places, consistent with the existing checkbox parity harness. Non-final spring/stroke/opacity values are asserted, not only final states. Separate normal Chromium checks exercise real unpaused original/native hover spring, single checkbox toggle, delayed redraw, Compact detail removal and Run callback under both motion preferences. Integration and PHP-minified combined execution evidence live in the external acervo component report/evidence directory.

Run npm run build and npm test in Assets/components. Regenerate reference CSS with `npx @tailwindcss/cli -i tests/reference/agent-plan.css -o tests/reference/agent-plan.generated.css`. sources-agent-plan.json pins copied reference source hashes; source font bytes are included.

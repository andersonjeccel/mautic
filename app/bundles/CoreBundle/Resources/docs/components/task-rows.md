# TaskRows

Standalone CoreBundle port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/task-rows.tsx`.

```twig
{% include '@MauticCore/Components/task-rows.html.twig' with {
    tasks: [{id:'fetch',title:'Fetch records',detail:'12ms',status:'running',note:'Details'}],
    variant: 'Default',
    className: 'assistant-tasks'
} only %}
```

tasks is required and uses unique string ids. TaskRow fields are id/title/status with optional detail/note; status is queued/running/completed/failed. Default variant supports expandable notes. Compact disables every row, removes notes/chevrons and uses compact padding/title size. Original Portuguese status labels are retained through Twig translation. String zero title/detail/note is preserved. Native buttons have type=button, real disabled and source conditional aria-expanded; note grids remain in the DOM while closed, without adding an aria-hidden or inert behavior absent in the original.

```javascript
const element = document.querySelector('[data-component="task-rows"]');
const rows = window.MauticUI.TaskRows.get(element);
rows.update({tasks: updatedTasks});
rows.update({variant: 'Compact'});
rows.update({variant: undefined});
element.addEventListener('mautic:task-rows:toggle', event => {});
```

update accepts tasks/variant/className. Omitted props remain unchanged; undefined optional props restore defaults. There is no controlled openId prop. Local id selection persists across missing/restored tasks, note removal and Compact changes. Removing the component disposes delegation; remount resets local state from server configuration and clears stale rows.

## ReactNode note adapter

Strings/numbers/booleans/null/undefined and nested arrays use source ReactNode truthiness/rendering: numeric zero disables expansion, string zero expands, true/empty array expand with empty content, and array zero renders inside the note. Plain strings stay escaped, never parsed as HTML. Rich content maps to trusted Twig captured markup or DOM node blueprints, not React runtime elements.

```twig
{% set note %}<p>Note <strong>bold</strong></p>{% endset %}
{% include '@MauticCore/Components/task-rows.html.twig' with {
    tasks: [{id:'rich',title:'Rich note',status:'queued',note:note}]
} only %}
```

Captured Twig Markup stays safe HTML through an inert note slot, even though its JSON representation is a string. The template distinguishes trusted markup from an ordinary string with identical HTML characters. The task_rows_notes embed block can supply template[data-note-slot] with data-rich-note for explicitly trusted custom content. JavaScript note may be a DOM node/fragment. Notes are cloned blueprints; bind nested behavior through the mounted DOM or existing component initializers. Unchanged note identity preserves its rendered subtree and uncontrolled input state across task metadata updates; removing it via Compact recreates it, matching unmount semantics.

## Motion fidelity

Running Loader2 vector spins linearly every 800ms, disabled under reduced motion. Completed/failed status span pops opacity/scale(0.85) over 200ms cubic-bezier(0.23,1,0.32,1), motion-safe only. Changing completed to failed preserves that span and its active CSSAnimation while replacing Check/X vectors, exactly as React; unchanged running metadata preserves SVG and spin track. Source Lucide paths/strokes (terminal stroke width 3) and license are included.

Chevron individual rotate animates over 200ms; note grid tracks animate over 240ms cubic-bezier(0.32,0.72,0,1). Closing retains content so collapse remains animated. Reduced motion suppresses spinner/pop but not source grid/chevron/hover transitions. Keyed host placement follows React lastPlacedIndex behavior. Borders, root shadow/radius, status badges, clipping, hover and inset/forced-colors focus match the reference.

## Checks

32 browser tests passed with 328 exact temporal comparisons across 16 theme/motion/viewport/variant configurations, status/expansion trajectories, terminal and spin identity, false/zero/empty note cases, selection restoration, nested rich JSX/native note with retained edited input, hover/focus, forced colors, native keyboard/no-submit and disposal/remount. Geometry, colors/borders, text, grid tracks, scale/rotate/transforms, opacity, SVG paths/strokes and disabled/ARIA match; pixels have no differences above threshold 0.05.

Sampling uses Chromium --disable-threaded-animation and independent CSSAnimation/CSSTransition times. Normal unpaused original/native checks cover real spinner, grid expansion/collapse, retained note and Compact in both motion preferences; a real PHP/Twig capture verifies safe markup hydration. Combined PHP-minified assets run with earlier controllers and actual font requests.

Run npm run build and npm test in Assets/components. Reference CSS is a tracked generated Tailwind fixture; regenerate with `npx @tailwindcss/cli -i tests/reference/task-rows.css -o tests/reference/task-rows.generated.css`. Source hash is in sources-task-rows.json. Production includes only task-rows.ts and lifecycle.ts, without React/Motion/Lucide runtime dependencies.

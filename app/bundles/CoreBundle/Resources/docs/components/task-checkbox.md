# Task Checkbox

Twig/TypeScript port of `spectrum-ui/components/task-checkbox.tsx`, using Motion's DOM renderer without React in production.

```twig
{% include '@MauticCore/Components/task-checkbox.html.twig' with {
    label: taskTitle, description: taskDescription, size: 'md', defaultChecked: false
} only %}
```

The original API maps checked/defaultChecked, label, description, size sm/md/lg, disabled and className. Plain label/description strings pass through translations and HTML escaping. Twig-captured markup can supply rich content without escaping trusted markup or translating HTML. Numeric zero and boolean content preserve the source's rendering rules. A numeric zero description renders as text without aria-describedby; the string zero is a real secondary description. Generated IDs connect the semantic checkbox button to its label and optional description before JavaScript. `id` optionally sets an installation-provided prefix.

```javascript
const control = window.MauticUI.TaskCheckbox.get(document.querySelector('[data-component="task-checkbox"]'));
control.update({ checked: false, onCheckedChange: (next) => control.update({ checked: next }) });
```

`onCheckedChange` requests a boolean next state. The native bubbling event `mautic:task-checkbox:change` carries `{ checked }`. Omit checked for internal state initialized by defaultChecked; later defaultChecked updates do not reset that state. Explicit undefined releases control. The source's null behavior displays internal state but continues to request changes. JavaScript label/description updates accept text, numbers, booleans, DOM nodes or null. className is passed through for host CSS; no general Tailwind utility compiler or React reconciliation is shipped. The source is a button with checkbox semantics, not a submitted form input, so no hidden input is added.

## Appearance and animation

- All three box/hit-target sizes, negative margins, row gaps, text sizes, original Manrope font, light/dark colors, disabled opacity, hover border and focus styles are retained.
- Press scaling and checked fill use the 500/30 spring. The positive box pop uses [1, .9, 1.05, 1], 400ms and offsets [0, .3, .7, 1].
- The check draws for 200ms after 60ms; opacity appears over 10ms after the same delay. Unchecking hides it over 100ms. The label line reveals over 250ms and retreats over 150ms with [0.22, 1, 0.36, 1] easing and the correct side origin.
- Six confetti particles alternate neutral/emerald, far/near radial distance and source dot sizes, animate for 500ms and remount for each positive user toggle, even if a controlled parent does not accept the checked state. Programmatic checked updates do not celebrate. Live size changes retarget existing particles without restarting their scale/opacity tracks.
- Reduced motion skips press/pop/confetti and jumps fill/check/line through the frame scheduler. CSS text/border color transitions remain as in the source. Zero-duration SVG attributes use initialized MotionValues on the main thread to avoid compositor raster differences from the source.
- AJAX mounting and detached-node cleanup release gestures, listeners and animations. Motion MIT notices and the original Manrope OFL file are included.

## Verification

Run `npm ci`, `npm run build`, `npm test` in `Assets/components` through DDEV. Actual Twig/PHP-minified assets run beside the byte-preserved React source in Chromium. The 12-configuration matrix covers three sizes, two themes and motion enabled/reduced. It samples SVG stroke/opacity, button/box/fill/strike geometry and matrices, confetti matrices/opacity, color transitions, interrupted check/uncheck, repeated bursts, live particle resizing, text/description updates and disabled interaction.

Numeric trajectories use four-decimal precision; computed colors compare exactly and screenshot differences must be zero at Pixelmatch threshold 0.05. Separate real-browser tests leave compositor animations and pointer capture unmodified to check mouse/text/keyboard activation, actual confetti cleanup, controlled/default/null states, zero/empty/boolean content, ARIA and AJAX disposal. Coverage refers to recorded cases, not arbitrary host-style or PNG byte identity.

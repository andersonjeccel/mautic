# Animated Switch

Native Twig/TypeScript port of `spectrum-ui/components/animated-switch.tsx`, without a React runtime. Motion's DOM renderer preserves the source springs and interruption behavior.

```twig
{% set onIcon %}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14M12 5v14" /></svg>{% endset %}
{% include '@MauticCore/Components/animated-switch.html.twig' with {
    size: 'md', defaultChecked: false, onIcon: onIcon,
    label: 'mautic.core.animated_switch.toggle'
} only %}
```

Options preserve checked/defaultChecked, onIcon/offIcon, size sm/md/lg, disabled, label and className. Twig-captured markup is trusted icon content; ordinary strings are escaped text, numbers render as text and boolean icons render an empty slot. Initial state and icon render on the server before JavaScript. Labels are translated; an explicitly empty label remains empty. Use a meaningful accessible name in the calling screen. Source sizes remain 32x18, 44x24 and 56x30 with a minimum 24px invisible hit area.

```javascript
const control = window.MauticUI.AnimatedSwitch.get(document.querySelector('[data-component="animated-switch"]'));
control.update({ checked: false, onCheckedChange: (next) => control.update({ checked: next }) });
```

The callback requests changes in controlled mode and commits internal state only when checked is undefined. Releasing control restores the internal state initialized by defaultChecked. Later defaultChecked updates do not reset it. The source's null behavior is also preserved: it displays internal state but still only requests changes. JavaScript icon updates accept text, numbers, booleans, DOM nodes or null. className is passed through for host CSS; a general Tailwind utility compiler is not supplied. `mautic:animated-switch:change` bubbles with `{ checked }`. AJAX mounting and detached-node disposal use the shared lifecycle.

## Motion and gestures

- Knob travel and 1.35x rounded press stretch use stiffness 500 and damping 30. Right-side stretch remains anchored by animating width and x together.
- Drag starts at 3px. The last five timestamped samples estimate velocity; at 250px/s the flick direction wins, otherwise the knob-center midpoint decides. The post-drag click is consumed once.
- Primary mouse/touch pointers, capture/release, cancellation, secondary-button behavior and nonmatching pointer IDs follow the source. Native Enter/Space activation remains available.
- Icons overlap during crossfade with stiffness 260/damping 22, entering at -45 degrees/0.5 scale and exiting at +45 degrees/0.5 scale. Retargeting reuses nodes and preserves current animation values.
- Reduced motion removes stretch and makes positional/icon changes zero-duration; the source's CSS background color transition still runs for 200ms with ease-out. Zero-duration opacity uses an initialized MotionValue on the main-thread frame scheduler so exit completion matches React Motion rather than waiting on compositor completion.
- Light/dark colors, knob shadow, focus ring and forced-colors outline reproduce the source. `--acervo-primary` overrides the track/focus primary color. Manrope and the Motion MIT/OFL notices are included.

## Verification

Run `npm ci`, `npm run build`, `npm test` in `Assets/components` through DDEV. Chromium uses actual Twig and PHP-minified assets next to the byte-preserved React source. The matrix covers three sizes, two themes and both motion preferences, comparing knob/SVG geometry and icon matrices/opacity to four decimal places, computed track colors exactly and sampled screenshots at Pixelmatch threshold 0.05.

Samples cover press/drag/stretch, small travel, interruption and reversal, flick-vs-midpoint decisions, pointer cancellation, secondary/nonprimary pointers, size changes, missing/overlapping/re-entering icons and SVG content. Pointer timestamps are synchronized with the sampling clock. Separate real-browser tests use unmodified compositor animations and real pointer capture to check mouse/keyboard changes, controlled/uncontrolled behavior, icon exit completion, disabled state, escaped/zero/boolean server output and AJAX cleanup. These checks cover recorded cases rather than claiming byte identity or arbitrary host-style equivalence.

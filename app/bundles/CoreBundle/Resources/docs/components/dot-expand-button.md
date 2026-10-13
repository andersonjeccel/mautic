# Dot Expand Button

Twig/CSS reconstruction of spectrum-ui/components/dot-expand-button.tsx. Its
animations are entirely CSS in the source; production needs no React, Motion or
component JavaScript.

Include @MauticCore/Components/dot-expand-button.html.twig. Props:
- children: label content; when omitted or null, label is used instead.
- label: fallback label. Explicit false/true/empty children do not use fallback;
  numeric and string zero are preserved.
- icon: icon content. Omitted uses the source arrow SVG; null/false omit it.
- type: defaults to button; submit/reset and explicit null are retained.
- className: root classes.
- attributes: native attributes, including disabled, ARIA, form/name/value.

Text label content is translated/escaped. Captured Twig markup is retained;
use embed blocks dot_expand_button_icon and dot_expand_button_children for rich
composition. Native DOM event listeners and references are available on the
button. Change disabled or native attributes through the standard DOM APIs.

```twig
{% include '@MauticCore/Components/dot-expand-button.html.twig' with {
    label: 'Continue', attributes: {'aria-label': 'Continue'}
} only %}
```

The button is 40px tall with an 8px gap, 12px left and 16px right padding. Hover
changes left padding to 8px, background to black and foreground to white. The
initial black dot has 4px padding around a zero-size, clipped icon. On hover its
background becomes white, while the icon grows from 0 to 18px and translates
from -200% to zero. Press rotates the icon -45 degrees and changes the button
background to neutral-700. All original transitions last 300ms with the generated
Tailwind cubic-bezier(.4,0,.2,1). Source reduced-motion media does not disable
these CSS transitions, so the port also leaves them active.

The default SVG preserves the exact path, stroke, line caps and viewBox. Colors
use source neutral OKLCH values. Font is the original Manrope; font size and
line-height are inherited, matching source button semantics.

Run npm run build and npm test in Assets/components. Browser tests compare the
original source against Twig in both themes, normal/reduced motion and 375/1024px
viewports. Hover, press, release and leave are sampled at nine points each;
interrupted hover exit is also sampled. Computed color/geometry/font/translation/
rotation must match exactly. Pixelmatch threshold is 0.05. Explicit intermediate
font-size/rotation assertions reject frozen animations. Semantic tests cover
nullish fallback, escaped/falsy content, custom icons, disabled controls, default
and omitted type, keyboard activation and native FormData submitter value zero.
These establish coverage for tested states, not arbitrary external caller CSS.

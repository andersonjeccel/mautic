# Animated Toggle

Twig/DOM reconstruction of `animate-ui/components/radix/toggle.tsx` and
`animate-ui/primitives/radix/toggle.tsx` from the local Acervo sources. React is
used only by reference tests. Motion's vanilla DOM runtime provides animations.

## Styled component

```twig
{% include '@MauticCore/Components/animated-toggle.html.twig' with {
    children: 'Bold',
    defaultPressed: false,
    variant: 'outline',
    size: 'default'
} only %}
```

- `variant`: `default`, `outline`, or `null`.
- `size`: `default`, `sm`, `lg`, `icon`, or `null` (no size utility).
- `pressed`, `defaultPressed`, `disabled`: preserve the source state contracts.
- `children`: translated text, numbers, or captured Twig markup. Boolean children
  produce no text. Supply SVG/HTML as trusted captured markup, not unescaped input.
- `className` and `attributes`: apply to the inner item, as in the React wrapper.
  `attributes: {tabindex: 0, 'aria-invalid': true}` exposes item focus styling.

## Primitives

`animated-toggle-root.html.twig` exposes the `toggle_content` block. Include
`animated-toggle-item.html.twig` and `animated-toggle-highlight.html.twig` inside
that block, retaining the root's `contextPressed` / `contextDefined` variables.
Set `highlightEnabled: true` when composing a custom highlight. `itemEnabled:
true` is a convenience composition of the default highlight and item. Bare
roots do not acquire the styled component's sizes, positioning, background, or
borders. `rootClassName`, `highlightClassName`, and `highlightStyle` customize
primitive layers. A root without a highlight slot never creates one on click.

## DOM API

```js
const toggle = window.MauticUI.AnimatedToggle.get(element);
toggle.update({pressed: true, size: 'sm', variant: 'outline'});
toggle.update({onPressedChange: (pressed) => console.log(pressed)});
const context = toggle.getContext();
context.setIsPressed(false);
```

The change callback and bubbling `mautic:animated-toggle:change` event carry
`pressed`. `onClick` can prevent the default toggle action. Destruction removes
listeners and stops active animations; CoreBundle's content lifecycle disposes
controllers removed from the DOM.

The source has two distinct states. Radix manages the button's `aria-pressed`,
while `useControlledState` manages the item and highlight. A click with unchanged
controlled `pressed: false` can therefore leave the button off and the content
on. Updating with that same value does not reset context: the source effect runs
only when the value changes. `getContext().setIsPressed` changes context only.
These details are preserved, not normalized into a single state.

Disabled stops native button interaction. The source's `disabled:` style utility
is on a `div`, so it does not dim that item's text. Missing initial context omits
the item's `aria-pressed`; it does not coerce that value to false. No form field
is submitted by the toggle.

## Animation and reference validation

The outer button uses a `0.95` tap spring: stiffness `550`, damping `30`,
`restSpeed: 10`. Highlight enter/exit uses a 300ms tween with bezier
`[0.25, 0.1, 0.35, 1]`; interruptions retain the active value and DOM node.
Hover colors and focus shadows use 200ms CSS transitions. The reference does not
opt into user reduced motion, so its animations remain active for both media
preferences. Space activates the native button without the Motion tap gesture;
Enter and pointer gestures retain their original Motion behavior.

Run `npm run build` and `npm test` in `Assets/components`. Reference tests compare
React and Twig over two variants, four sizes, two themes, and two motion
preferences. Tests check sampled animation geometry, opacity, state, callbacks,
and screenshots with Pixelmatch threshold `0.05`; this is sampled equivalence,
not a claim that every possible React motion prop or external stylesheet has
been compared. Other tests exercise bare primitives, initial/null values,
keyboard and real pointer interaction, form behavior, focus, and exit cleanup.

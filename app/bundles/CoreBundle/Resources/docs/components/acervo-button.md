# Acervo Button

Twig/CSS reconstruction of `shadcn-ui/primitives/button.tsx`.

```twig
{% include '@MauticCore/Components/acervo-button.html.twig' with {
    children: 'Save', type: 'submit', name: 'action', value: 'save',
    variant: 'default', size: 'default'
} only %}
```

Variants: default, destructive, outline, secondary, ghost, link, or null (omit
variant utilities). Sizes: default (40px), sm (36px), lg (44px), icon (44px minimum
height/width), or null. Content can be translated text, zero, or captured Twig
markup. Boolean content is omitted. SVG descendants retain the source's 16px
size, no pointer events, and no flex shrinking.

The default tag is a native button. Its type is intentionally not forced to
button: like React, omitting type inside a form leaves native submit behavior.
Use type: button when an action must not submit. Native disabled, name, value,
form association and keyboard activation are retained. Common direct attributes
are disabled, type, name, value, id and title; other attributes are passed through
attributes. False boolean HTML attributes are omitted; ARIA/data booleans retain
literal true/false values.

For asChild, pass asChild: true, tag, childAttributes and childClassName. Child
attributes override parent attributes, including disabled: false. Supported tags
are button, a, span, div, label, strong, em and p. The chosen element retains its
native semantics: a disabled attribute does not disable a link. Attach native DOM
listeners for caller actions. No component JavaScript or React production runtime
is needed.

The source's 150ms color transitions use cubic-bezier(.4,0,.2,1). Hover alpha is
90% for primary/destructive and 80% for secondary. Focus-visible uses a 2px ring
with 2px theme-background offset. Forced colors expose a 2px transparent outline,
matching Tailwind's outline-hidden behavior. Disabled uses opacity 0.5 and no
pointer events. The source does not disable these CSS transitions for reduced
motion. Its destructive-foreground utility is absent from the local theme, so
that variant inherits page foreground rather than primary text color.

Run npm run build and npm test in Assets/components. Reference tests preserve
original React source bytes and cover six variants, four sizes, two themes and
two motion preferences. Intermediate initial/hover/leave/focus/blur/variant-change
frames require matching geometry and computed styles plus zero screenshot
changes above Pixelmatch 0.05. Additional cases cover form submission, value 0,
disabled, child-slot attributes, SVG geometry, escaping, null variants/sizes and
forced-colors keyboard focus. This is explicit sampled coverage, not proof for
all arbitrary caller CSS and React subtrees.

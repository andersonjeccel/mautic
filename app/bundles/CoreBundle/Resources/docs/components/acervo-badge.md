# Acervo Badge

Twig/CSS equivalent of `shadcn-ui/primitives/badge.tsx`. Include
`@MauticCore/Components/acervo-badge.html.twig` with `children`, `variant`,
`className`, and `attributes`. Variants are default, secondary, destructive,
outline, and null (omit variant utilities). Text is translated; zero is retained,
booleans are omitted, and captured Twig markup is supported without unescaping
untrusted strings.

The default element is a div. For the source's Radix Slot behavior, use
`asChild: true`, `tag`, `childAttributes`, and `childClassName`. Child attributes
win over parent attributes and child classes are added after parent classes.
Supported tags are div, span, a, button, label, strong, em and p. Supply href for
links, and type for buttons as appropriate; the badge itself adds no button
behavior or form value. Standard native DOM listeners handle caller interactions.
No component JavaScript or React production runtime is required.

The pill uses a 1px border, 10px horizontal/2px vertical padding, 12px semibold
Manrope, and the original 150ms color transition with cubic-bezier(.4,0,.2,1).
Focus applies a 2px colored ring with the original 2px white offset. Hover changes
primary/secondary/destructive fill to 80% alpha. The local source has no
`destructive-foreground` theme utility, so destructive text retains the page
foreground rather than acquiring the primary variant's text color. User reduced-motion preference
does not disable these CSS transitions in the source, so both preferences retain
this behavior. CSS custom properties --acervo-primary, --acervo-secondary,
--acervo-destructive, --acervo-foreground and their foreground/ring counterparts
allow theme overrides.

Run npm run build and npm test in Assets/components. The tests compare original
React source and Twig/CSS over four variants, two themes and two motion
preferences, sampling initial, hover, leave, focus, blur and variant-change
states. Geometry and computed styles must match; screenshots use Pixelmatch
threshold 0.05. Tests also cover child links/buttons, attribute precedence, null
variants, zero, booleans and escaped text. These are explicit sampled cases, not
universal coverage of arbitrary caller CSS and React child elements.

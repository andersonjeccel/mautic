# Acervo Alert

CoreBundle Twig/CSS reconstruction of shadcn-ui/primitives/alert.tsx. This source
has no animation or component JavaScript.

Templates and corresponding exports:
- acervo-alert.html.twig: Alert, div, role=alert, block alert_children.
- acervo-alert-title.html.twig: AlertTitle, h5, block alert_title.
- acervo-alert-description.html.twig: AlertDescription, div, block alert_description.

All accept className, attributes and children (text or captured Twig markup).
Plain text is translated/escaped; captured markup and nested content are kept.
False/true children render no text, while numeric/string zero are preserved.
False hidden/inert attributes are omitted; ARIA/data booleans remain literal
strings. Caller role replaces the container's default role, matching the source
attribute spread order. Native event listeners and DOM references can be attached
to the rendered elements; there is no React runtime dependency.

Alert accepts variant default or destructive. Omitted variant uses default;
explicit null omits variant styling, matching class-variance-authority. Arbitrary
unknown variants also have no specific style. Default uses the source background
and foreground; destructive has a transparent background, destructive text and
50% destructive border in light theme, full destructive border in dark theme.
Colors can be overridden with --acervo-background, --acervo-foreground and
--acervo-destructive; otherwise the exact source theme colors apply.

The container has 16px padding, 8px corners, full width and a 1px border.
Direct SVG children are positioned 16px from top/left. Subsequent siblings have
28px left padding; an immediately adjacent div is translated up 3px. Title uses
500 weight, inherited font size, line-height 1, -0.025em tracking and 4px bottom
margin. Description is 14px/20px; nested paragraphs use 1.625 line-height.

```twig
{% embed '@MauticCore/Components/acervo-alert.html.twig' with {
    variant: 'destructive', attributes: {id: 'validation-alert'}
} %}
    {% block alert_children %}
        {% include '@MauticCore/Components/acervo-alert-title.html.twig' with {
            children: 'Title'
        } only %}
        {% include '@MauticCore/Components/acervo-alert-description.html.twig' with {
            children: 'Description'
        } only %}
    {% endblock %}
{% endembed %}
```

Run npm run build and npm test in Assets/components. The 52 browser cases compare
the original React source against Twig: 32 variant/theme/viewport/icon layouts,
two adjacent-description icon layouts and 18 standalone-part/escaped/falsy/ARIA
cases. Every case compares pixels at Pixelmatch threshold 0.05. Composition
cases also compare child geometry. These checks establish the covered source
states, not universal equivalence under arbitrary caller CSS.

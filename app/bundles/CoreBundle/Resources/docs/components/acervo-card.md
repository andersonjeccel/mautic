# Acervo Card

Twig/CSS reconstruction of `shadcn-ui/primitives/card.tsx`, including its six
exports. No animation or component JavaScript exists in the original.

Templates:
- acervo-card.html.twig: container, block card_children.
- acervo-card-header.html.twig: header, block card_header.
- acervo-card-title.html.twig: title, block card_title.
- acervo-card-description.html.twig: description, block card_description.
- acervo-card-content.html.twig: content, block card_content.
- acervo-card-footer.html.twig: footer, block card_footer.

All use div elements, matching the source (including CardTitle). Pass children,
className and attributes, or use embed to override the corresponding block.
Text is translated. Captured Twig markup is retained, booleans are omitted,
zero is preserved, and untrusted plain strings remain escaped. Attributes support
caller role/ARIA/IDs/styles; false hidden/inert attributes are omitted.

The container has 8px corners, a 1px current-color border, original card theme
colors and no visible shadow. Header/content/footer use 24px spacing; content and
footer omit top padding. Header children have the source's 6px vertical spacing.
Title is 24px semibold, line-height 1 and -0.025em tracking. Description is 14px,
20px line-height with the original muted foreground. Footer is a horizontal flex
container with centered alignment. Content is not normalized into paragraphs or
headings; callers choose their own semantic structure.

```twig
{% embed '@MauticCore/Components/acervo-card.html.twig' %}
    {% block card_children %}
        {% include '@MauticCore/Components/acervo-card-title.html.twig' with {
            children: 'Title', attributes: {role: 'heading', 'aria-level': 2}
        } only %}
        {% include '@MauticCore/Components/acervo-card-content.html.twig' with {
            children: 'Content'
        } only %}
    {% endblock %}
{% endembed %}
```

Run npm run build and npm test in Assets/components. Reference tests compare
composed cards at 375px and 1024px in light/dark themes, each standalone part,
line wrapping, nested rich content, escaping, zero/boolean values and ARIA.
Pixelmatch threshold is 0.05. This is explicit fixture coverage, not a universal
claim for all external caller CSS and React subtrees.

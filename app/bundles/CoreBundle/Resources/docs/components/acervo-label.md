# Acervo Label

Twig/DOM equivalent of `shadcn-ui/primitives/label.tsx`. Include
`@MauticCore/Components/acervo-label.html.twig` with `children`, `htmlFor`,
`className`, and optional `attributes`. Text is translated; captured Twig markup
is rendered as trusted content. Boolean children are omitted and zero is kept.

For Radix's `asChild` behavior, supply `asChild: true`, `tag`, `childAttributes`
and `childClassName`. Child attributes override parent attributes. Supported
slot tags are label, span, div, p, a, button, strong and em; use semantic elements
that suit the caller. A span with a for attribute does not become a native label.

A preceding disabled `.peer` sibling applies opacity 0.7 and a not-allowed cursor.
The native label/control association remains responsible for focusing or toggling
the linked field. The original has no animation.

`window.MauticUI.AcervoLabel.get(element).update({htmlFor, onMouseDown})` changes
the association and callback. Mouse-down on an interactive descendant skips the
callback. Other multi-click mouse-down events prevent the browser's text
selection default unless the callback already prevented it. Removed elements
are disposed by the common CoreBundle content lifecycle.

Run `npm run build` and `npm test` in `Assets/components`. Tests compare eight
light/dark, enabled/disabled-peer and viewport cases against the preserved React
source at Pixelmatch threshold 0.05. Other tests cover associations, double-click,
interactive descendants, child tag/attribute precedence, lifecycle, escaping,
zero and boolean children.

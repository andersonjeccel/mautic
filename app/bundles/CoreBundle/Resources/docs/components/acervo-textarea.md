# Acervo Textarea

Twig/JavaScript port of `shadcn-ui/primitives/textarea.tsx`. The source has no custom animation or transition; the native port does not add one. No React or Motion runtime is shipped.

```twig
{% include '@MauticCore/Components/acervo-textarea.html.twig' with {
    id: 'description', name: 'description', label: 'mautic.core.description',
    defaultValue: '', rows: 5, required: true
} only %}
```

The native textarea preserves value/defaultValue, disabled/readOnly/required, autofocus, rows/cols/wrap, spellCheck, autocomplete, maxlength/minlength and native validity, editing, selection, resizing, reset and form submission. `0` remains a controlled value; `null`/`undefined` release control. A leading newline is protected from HTML's textarea parsing rule. Values are escaped and never translated; labels and placeholders are translated. `attributes` carries extra DOM/ARIA/data attributes and `className` accepts host CSS classes. The port does not supply a general Tailwind utility compiler or React reconciliation.

```javascript
const field = window.MauticUI.AcervoTextarea.get(document.querySelector('#description'));
field.update({ value: '', onChange: (event) => {
  field.update({ value: event.target.value });
} });
```

Use `controller.element` instead of a React ref. Updates support value/defaultValue, disabled/readOnly/required and common native attribute options declared in `shared/field-control.ts`. Unlike input, textarea preserves an explicitly supplied defaultValue during controlled-value updates, matching the source React behavior. `onChange` exposes type `change`, nativeEvent, target/currentTarget, preventDefault/stopPropagation, persist and default/propagation-state queries. Other supported callbacks receive native DOM events. `mautic:field:change` bubbles with `{ value, checked }`. AJAX mounting and listener cleanup use the shared Core component lifecycle.

Appearance preserves 80px minimum height, 6.4px radius, 14px/20px Manrope, vertical resize, original placeholder/border/background colors, disabled opacity and the 2px focus ring with 2px background offset. Forced-colors focus keeps the source's outline. `.dark` uses the original dark palette; `--acervo-background`, `--acervo-input`, `--acervo-foreground`, `--acervo-muted-foreground` and `--acervo-ring` override its tokens. Manrope's original bytes and OFL license are included.

## Verification

Run `npm ci`, `npm run build` and `npm test` in `Assets/components` through DDEV. Chromium renders real Twig and PHP-minified assets beside the byte-preserved React source. Light/dark and 375px/1024px cases cover placeholder, content, readonly, disabled, invalid and focus. Pixelmatch threshold is 0.05; coverage does not claim byte identity or arbitrary host-style parity. Behavioral tests compare controlled and defaultValue updates, selection and newline/zero/escaped values, and exercise forms, attribute updates, change callbacks, AJAX cleanup and forced colors.

# Acervo Input

Twig/JavaScript port of `shadcn-ui/primitives/input.tsx`. The element remains a native input; no React or Motion runtime is shipped. The source has no custom animations or transitions, and the port does not introduce any.

```twig
{% include '@MauticCore/Components/acervo-input.html.twig' with {
    id: 'email', name: 'email', type: 'email', label: 'mautic.core.email',
    placeholder: 'mautic.core.email', defaultValue: '', required: true
} only %}
```

`type`, `value`, `defaultValue`, `checked`, `defaultChecked`, `disabled`, `readOnly`, `required`, `multiple`, `autoFocus`, `spellCheck`, common native string/numeric attributes and `className` are preserved. Use `attributes` for extra DOM/ARIA/data attributes. `label` adds a translated accessible name; placeholder is translated and escaped. Field values are escaped, never translated. A DOM reference is available through `controller.element` rather than React `ref`.

Omit `value`/`checked` for uncontrolled fields. `null`/`undefined` release control, while `0` and an empty string remain controlled values. Native editing, selection, validity, reset, form submission, file uploads and checkbox/radio semantics remain available.

```javascript
const field = window.MauticUI.AcervoInput.get(document.querySelector('#email'));
field.update({ value: '', onChange: (event) => {
  field.update({ value: event.target.value });
} });
```

`onChange` receives an adapter with `type: 'change'`, `nativeEvent`, `target`, `currentTarget`, `preventDefault`, `stopPropagation`, `persist`, `isDefaultPrevented` and `isPropagationStopped`. Text changes use input events, checkbox/radio changes use click and file selection uses change. The other supported event callbacks receive browser DOM events. A bubbling `mautic:field:change` event exposes `{ value, checked }`. Updates support value/defaultValue, checked/defaultChecked, disabled/readOnly/required and the common native attribute options declared in `shared/field-control.ts`. AJAX nodes initialize automatically and detached nodes release listeners.

Styles reproduce the source theme, 40px height, 6.4px radius, mobile 16px/desktop 14px text, placeholder, file button, disabled opacity and focus ring. The original Manrope file and OFL license are included. `.dark` selects the original dark palette; `--acervo-background`, `--acervo-input`, `--acervo-foreground`, `--acervo-muted-foreground` and `--acervo-ring` override tokens. `className` supports host CSS classes; no general Tailwind utility compiler or React reconciliation is supplied.

## Verification

From `Assets/components`, run `npm ci`, `npm run build` and `npm test` through DDEV. The tests render actual Twig and PHP-minified assets in Chromium, compare the original React source at 375px and 1024px in light/dark themes, and exercise controlled values, defaultValue updates, editing, callbacks, selection, native forms, disabled fields, escaping and AJAX cleanup. Visual cases cover placeholder, content, disabled, readonly, invalid, password, number and file inputs, with and without focus. Pixelmatch uses threshold 0.05; this is perceptual coverage of the recorded cases, not byte-identical output for arbitrary host overrides.

# Stepper

Sequential flow component: next/back, branching and remote form steps. Bootstrap
only provides the presentation (cards, buttons, spinner, progress).
Source: `app/bundles/CoreBundle/Assets/js/17.stepper.js` (plain JS, no build step).

## Linear flow

```html
<div data-stepper>
  <div data-step>
    First screen
    <button type="button" data-step-next>Next</button>
  </div>
  <div data-step hidden>
    Second screen
    <button type="button" data-step-back>Back</button>
    <button type="button" data-step-next>Next</button>
  </div>
  <div data-step hidden>Third screen</div>
</div>
```

## Attributes

- `data-stepper`: root.
- `data-step` / `data-step="name"`: a step. Only one is visible at a time.
- `data-step-next` / `data-step-next="name"`: next step, or the named one (branching).
- `data-step-back` / `data-step-back="name"`: last visited step, or the named one.
- `data-step-submit="name"`: on a `<form>`, POST it via `fetch` and put the returned HTML in the named step (empty = next step), then show it.
- `data-step-loading`: element shown while a request is pending.
- `data-stepper-progress`: progress bar whose width follows the current step position.

Handlers are delegated on `document`, so content injected by AJAX works without re-initialization.

## Remote forms

```twig
<div data-stepper>
  <div data-step="upload">
    <form action="{{ path('mautic_asset_analyze') }}" method="post" enctype="multipart/form-data" data-step-submit="configuration">
      {{ form_widget(form) }}
      <button type="submit">{{ 'mautic.core.form.save'|trans }}</button>
    </form>
  </div>
  <div data-step="configuration" hidden></div>
  <div data-step-loading hidden>{{ 'mautic.core.loading'|trans }}</div>
</div>
```

The controller returns an HTML partial:

- **2xx:** HTML goes into the target step, which is shown.
- **422:** HTML replaces the current step (form with errors); stays on it.
- **Anything else, redirects or network errors:** nothing changes; `stepper:error` is emitted.

```php
return $this->render('@MauticAsset/Asset/_upload.html.twig', ['form' => $form->createView()], new Response('', Response::HTTP_UNPROCESSABLE_ENTITY));
```

## Events (bubbling, on the root)

`stepper:show` (cancelable), `stepper:shown`, `stepper:success`, `stepper:error`. `detail` has `from`/`to`, `response` or `error`.

# Stepper

Sequential flow component: next/back, branching and remote form steps. It only
manages state; presentation comes from the classes available in the theme.
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
- `data-step-loading`: element shown while a request is pending. Give it `role="status"` so the loading text is announced.
- `data-stepper-indicator`: step list (`@MauticCore/Helper/progress_indicator.html.twig` with `stepper: true`, ported from the Marketplace). The stepper sets `progress-indicator-step--complete|current|incomplete` and `aria-current` on each item by position.
- `data-stepper-progress`: progress bar. Its width and `role="progressbar"`/`aria-value*` follow the current step position. Give it an `aria-label`.

Handlers are delegated on `document`, so content injected by AJAX works without re-initialization.

## Remote forms

```twig
<div data-stepper>
  <div data-step="upload">
    <form action="{{ path('mautic_asset_action') }}" method="post" enctype="multipart/form-data" data-step-submit="configuration">
      {{ form_widget(form) }}
      <button type="submit">{{ 'mautic.core.form.save'|trans }}</button>
    </form>
  </div>
  <div data-step="configuration" hidden></div>
  <div data-step-loading hidden>{{ 'mautic.core.loading'|trans }}</div>
</div>
```

The route and partial names are illustrative (the Asset bundle's `upload` action is a working example). The controller returns an HTML partial, which must be Twig-escaped since it is injected as HTML. Mautic's `X-CSRF-Token` header is sent automatically for AJAX POSTs:

- **2xx:** HTML goes into the target step, which is shown.
- **422:** HTML replaces the current step (form with errors); stays on it.
- **Anything else, non-HTML responses, redirects or network errors:** nothing changes; `stepper:error` is emitted. An unknown `data-step-submit` target also emits `stepper:error`.

```php
return $this->render('@MauticAsset/Asset/_upload.html.twig', ['form' => $form->createView()], new Response('', Response::HTTP_UNPROCESSABLE_ENTITY));
```

## Events (bubbling, on the root)

`stepper:show` (cancelable), `stepper:shown`, `stepper:success`, `stepper:error`. `detail` has `from`/`to` (`show`/`shown`), `response` (`success`, `error`) or `error`.

While a request is pending, Next/Back and further submits are ignored. After a step change focus moves to the new step; after a 422 it moves to the first invalid field.

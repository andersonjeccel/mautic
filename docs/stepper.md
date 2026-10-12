# Stepper

Stepper is a Mautic workflow component. Bootstrap can style its cards, buttons,
spinners and progress bars, but does not control navigation. No Tab plugin,
IDs, targets or configuration are required for a linear flow.

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

The first step without `hidden` is initially selected, or the first step if all
are hidden. Only one step is visible per root. Use translated labels in real
Twig templates and `type="button"` for navigation inside a form.

## Attribute API

- `data-stepper`: the component root.
- `data-step`: an unnamed step, ordered by its position in the root.
- `data-step="name"`: a named step. Names must be unique within the root.
- `data-step-next`: go to the next step in document order.
- `data-step-next="name"`: go to the named step, allowing branching.
- `data-step-back`: return to the last visited step; without navigation history,
  go to the previous step in document order.
- `data-step-back="name"`: go to a named step.
- `data-step-submit="name"`: intercept this form's submission, POST it and place
  the returned HTML in the named step. An empty value selects the next step.
- `data-step-loading`: an optional element visible while a request is pending.
- `data-stepper-progress`: an optional progress bar. Its width and ARIA values
  reflect the selected step's position in document order, not the branching
  path or server-side processing percentage. The first of three steps is 33%.

Use unique sibling step containers for each workflow. Nested steppers and
multiple roots are independent. Unknown targets and navigation beyond the first
or last step are no-ops. Navigation itself does not submit or validate forms;
use a remote form or cancel `stepper:show` for feature-specific validation.

## Remote forms

```twig
<div data-stepper>
  <div data-step="upload">
    <form action="{{ path('mautic_asset_analyze') }}"
          method="post" enctype="multipart/form-data"
          data-step-submit="configuration">
      {{ form_widget(form) }}
      <button type="submit">{{ 'mautic.core.form.save'|trans }}</button>
    </form>
  </div>
  <div data-step="configuration" hidden></div>
  <div data-step="processing" hidden></div>
  <div data-step-loading hidden>
    {{ 'mautic.core.loading'|trans }}
  </div>
</div>
```

The route is illustrative: the feature supplies its own controller, Symfony
form, access checks, CSRF protection and MIME-specific partials. Stepper does
not analyze files or choose partials.

The browser performs native constraint validation before sending the form;
`novalidate` and a submitter's `formnovalidate` are respected. Requests use
`FormData`, include file uploads, hidden CSRF fields and the clicked submit
button's name/value, and send same-origin credentials. A submit button may
specify `formaction` and `formmethod`. Only same-origin POST actions are
supported. Do not manually set the multipart `Content-Type`; the browser adds
the boundary. Requests send `Accept: text/html` and
`X-Requested-With: XMLHttpRequest`.

### Response contract

Return a partial with `Content-Type: text/html`, not a full page or JSON:

- **2xx HTML:** replace the target step's contents and advance. The step wrapper
  remains in the DOM.
- **422 HTML:** replace the current step's contents, stay on that step and emit
  `stepper:error`. Return the complete contents of the step, including its form
  and `data-step-submit`, so the user can correct and resubmit it.
- **Other HTTP status, network error or non-HTML response:** leave the current
  content intact and emit `stepper:error`.
- **Redirect:** treated as an error. Do not redirect to the next workflow step
  or a login page; return the appropriate partial/status instead.

For example, a Symfony controller can return a validation partial with:

```php
return $this->render(
    '@MauticAsset/Asset/_upload.html.twig',
    ['form' => $form->createView()],
    new Response('', Response::HTTP_UNPROCESSABLE_ENTITY),
);
```

A configuration partial can contain another form with
`data-step-submit="processing"`. Its controller can return the processing or
finished partial. Injected forms and navigation buttons work immediately through
root-level delegation. If a partial needs other Mautic widgets, initialize them
in a feature-specific event listener.

While a request is pending, additional submissions and navigation are blocked,
`aria-busy` is set and loading elements are shown. The previous busy attribute
is restored on completion, including failures. Removing the root aborts its
pending request without emitting a workflow error.

Returned HTML must be trusted server-rendered markup, escaped by Twig. Stepper
does not sanitize HTML or execute scripts embedded in partials.

## JavaScript API

The asset pipeline exposes the class as `Mautic.Stepper`:

```js
const root = document.querySelector('[data-stepper]');
const stepper = Mautic.Stepper.getOrCreateInstance(root);
stepper.next();
stepper.back();
stepper.show('configuration');
await stepper.submit(form, 'processing');
```

`next(target?)`, `back(target?)` and `show(target)` return a boolean indicating
whether navigation occurred. Targets may be a step name, a zero-based index or
an owned step element. `submit(form, target?, submitter?)` returns a promise of
a boolean: true for a successfully handled 2xx response, false for a rejected,
canceled or failed submission. A canceled show event may keep the current step
even after a successful request.

Initialization runs on DOM ready and for roots added by AJAX. Constructors and
`getOrCreateInstance` are idempotent. `Mautic.Stepper.initialize(container)` can
also initialize a subtree explicitly. `dispose()` removes root handlers and
aborts its request. Removed roots are disposed automatically; moving a root
within the document preserves its state.

## Events

Events bubble from the root. All include `event.detail.stepper`:

- `stepper:show`: before navigation; cancelable. Detail: `from`, `to`.
- `stepper:shown`: after visibility/progress update and focus. Detail: `from`, `to`.
- `stepper:submit`: before a remote request; cancelable. Detail: `from`, `to`, `form`.
- `stepper:success`: after handling a 2xx partial. Detail: `from`, `to`, `form`, `response`.
- `stepper:error`: after a 422 or request failure. Detail: `from`, `to`, `form`,
  plus `response` when available and `error` for request/protocol failures.

The initial selection does not emit navigation events or move focus. Later
navigation focuses an autofocus element, or the step container itself. Steps
also receive `aria-hidden`; the progress bar receives its progressbar role and
numeric values. Give a progress bar an accessible label in the template.

```js
root.addEventListener('stepper:shown', event => {
  initializeFeatureWidgets(event.detail.to);
});
root.addEventListener('stepper:error', event => {
  if (event.detail.response?.status !== 422) {
    showTranslatedRequestError();
  }
});
```

## Build and test

Source: `app/bundles/CoreBundle/Assets/ts/stepper.ts` (strict TypeScript,
ES2019 target). The generated `Assets/js/17.stepper.js` is tracked because
Mautic's PHP asset pipeline discovers JavaScript files directly. The small
`Assets/css/stepper.css` rule keeps hidden steps hidden even when a card or
spinner class sets `display`.

```sh
ddev exec npm ci --ignore-scripts
ddev exec npm run build:stepper
ddev exec npx playwright install --with-deps chromium
ddev exec npm run test:stepper
```

Run these from the actual checkout. For a worktree inside an existing DDEV
project, pass `--dir /var/www/html/.worktrees/stepper` to `ddev exec` so the build
and tests use that worktree's source and dependencies.

`npm run build` also builds Stepper. Never hand-edit the generated JavaScript.
The focused GitHub Actions workflow checks compilation, browser behavior and
that the tracked bundle matches its source. Browser tests use Chromium and a
real local HTTP server, including multipart uploads, chained submissions,
422 retries, error handling, delegation, loading, accessibility and lifecycle.

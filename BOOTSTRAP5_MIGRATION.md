# Bootstrap 5 consumer migration

## Base and branch order

The migration starts at `UXUI-264-bootstrap-compatibility`, commit
`5adcb13ed72bc14cdbfe5a9c569656c6aa0c7c5e`. That branch already installs Bootstrap
5 and provides a legacy compatibility layer. The consumer changes do not replace
that base, remove jQuery from Mautic, or claim that every Bootstrap 3 contract can
already be deleted.

The branches are stacked. Review each branch against its predecessor, not all of
them independently against the original base:

1. `migration/bootstrap5-php`: form labels, sizing and presentation utilities,
   native component attributes emitted by PHP, and button-helper tooltip markup.
2. `migration/bootstrap5-twig`: native attributes and presentation utilities in
   templates, native tab triggers, and sibling `btn-check` inputs and labels in
   the shared button-group form theme. Disabled input submission semantics are
   retained; readonly controls are not automatically disabled.
3. `migration/bootstrap5-js-attributes`: markup, selectors and attributes embedded
   in application and plugin JavaScript. Mautic's `data-toggle="ajax"`,
   `data-toggle="ajaxmodal"` and confirmation attributes remain application APIs.
4. `migration/bootstrap5-js-api`: native component constructors, instance methods,
   `dispose()` and `setContent()`, native popovers, and modal show/hide lifecycle
   handling. Redundant popover initialization is removed.
5. `migration/bootstrap5-template-states`: native active links and `show` states
   in individual tab templates, including list-group tabs and configuration tabs.
6. `migration/bootstrap5-styles`: application selectors for migrated utilities,
   active links, checked inputs, native popover bodies, and native dropdown state.
   Unreferenced Glyphicons assets and font configuration are removed. Includes
   the database-free component test suite.
7. `migration/bootstrap5-integration`: native dropdown items in PHP-generated and
   static menus, keyboard-accessible help actions, correctly escaped confirmation
   tooltips, native backdrop cleanup when refreshing a page, final regression
   tests and this handoff.

## Official migration inventory

Review against both official migration guides; the Bootstrap 5 guide alone does
not list everything removed between Bootstrap 3 and 4:

- [Bootstrap 3 to 4](https://getbootstrap.com/docs/4.6/migration/)
- [Bootstrap 4 to 5](https://getbootstrap.com/docs/5.3/migration/)

### Implemented consumer changes

- `control-label` to `form-label`; `sr-only` to `visually-hidden`;
  `img-responsive` to `img-fluid`; `table-condensed` to `table-sm`.
- Modern size, alignment and float utilities; matching application stylesheet
  selectors are migrated alongside emitted markup.
- Bootstrap component toggles, dismissals, targets, placement, parent and other
  recognized component options use `data-bs-*`. Attributes belonging to Mautic
  and third-party plugins are not blindly prefixed.
- Native tabs use active `.nav-link` elements and `show active` pane states.
  Existing navigation appearance follows the selected link instead of relying
  exclusively on an active parent `li`.
- Shared toggle-button choices use adjacent inputs and labels. Checked styling
  uses `:checked`, not Bootstrap 3's JavaScript button-group plugin.
- Dropdown items use `.dropdown-item`, including confirmation actions generated
  by the PHP button helper. Help-menu modal actions have focusable links.
- Bootstrap instances replace application calls to the old jQuery component
  plugins. Tooltip title updates preserve the existing instance using the public
  `setContent()` API; popover bodies use `.popover-body`.
- Mautic modal-close requests arriving during a fade-in wait for `shown.bs.modal`
  before invoking native `hide()`. Bootstrap owns removal of the backdrop and
  `modal-open` after closing; page-refresh responses no longer remove them early.
- Header dropdown styles recognize the native trigger's `.show` state without
  requiring application JavaScript to manufacture Bootstrap 3's `.open` marker.

### Retained contracts and follow-up work

This is preparation for removing the legacy layer in a future Mautic version,
not the removal itself. The official guides also require structural changes that
must be migrated with their application styles and tested routes:

- Panels and wells to cards or explicit Mautic components; labels to badges;
  media objects, thumbnails, page headers and custom navbar structures.
- The Bootstrap 3 grid's `col-xs-*`, offsets and push/pull utilities, together with
  the project's customized 480/768/992/1200 breakpoints. Blind renaming would adopt
  different Bootstrap 5 breakpoints and change responsive layouts.
- `hidden-*` and `visible-*` utilities, including their breakpoint and display
  contracts, not just their names.
- Horizontal forms, form groups, feedback states, input-group add-ons and button
  wrappers, inline choices, custom yes/no groups and mapping controls that still
  require the old `data-toggle="buttons"` behavior.
- Legacy styles and plugin integrations used by external themes and extensions.
  The compatibility adapter, removed-component exceptions and their legacy
  contract tests remain until those consumers are deliberately retired.

`Mautic.configureModal()` retains a narrow exception for changing `keyboard` and
`backdrop` on an already-open, shared AJAX modal. Bootstrap 5 does not expose a
public runtime configuration setter. The helper updates only those two options;
replacing the instance while it is open would orphan its backdrop or interrupt
its focus lifecycle. Browser tests cover a static modal becoming dismissible.

Do not delete the adapter or compatibility SCSS based solely on passing these
focused tests or on a search for old jQuery calls.

## Reproducing focused checks

Run from a checkout with dependencies installed from its lockfile. In a shared
DDEV worktree, separately verify that Composer loads the worktree's PHP classes;
a shared `vendor` directory otherwise resolves classes from the main checkout.

```sh
php bin/phpunit --configuration app/phpunit.xml.dist \
  app/bundles/CoreBundle/Tests/Unit/Twig/BootstrapMarkupTest.php \
  app/bundles/CoreBundle/Tests/Unit/Twig/Helper/TableHeaderTest.php

php bin/phpunit --configuration app/phpunit.xml.dist \
  app/bundles/FormBundle/Tests/Form/Type

php bin/codecept run bootstrap5 Bootstrap5ComponentsCest
```

The `bootstrap5` suite uses Selenium, Chrome and assertions, without initializing
or cleaning a test database. Its default endpoints match the existing DDEV
acceptance environment. The fixture renders the production tab and help-menu
Twig fragments, loads real application JS and official Bootstrap 5, and does not
load the compatibility adapter. AJAX/page lifecycle hooks unrelated to component
behavior are stubbed. Help labels come from the worktree's own English resources.

By default it loads the official Bootstrap stylesheet. Also run against the real
compiled application stylesheet:

```sh
var/dart-sass/sass --quiet --load-path=vendor/twbs/bootstrap/scss \
  app/bundles/CoreBundle/Assets/css/app.scss var/bootstrap5-validation.css

BOOTSTRAP5_VALIDATION_CSS="$PWD/var/bootstrap5-validation.css" \
  php bin/codecept run bootstrap5 Bootstrap5ComponentsCest
```

The test set exercises immediate modal-close responses, page-refresh responses,
Escape and static modal behavior, faded tabs and keyboard navigation, tooltip
content updates, collapse, and dropdown opening/closing and keyboard selection.
For compiled Mautic styles, it also checks header geometry and visible menu
bounds at verified 375px and 1280px viewports. Chrome device-metrics overrides are
used because resizing a desktop window can clamp its minimum width above 375px.

These are component-fragment tests, not authenticated full-page route coverage,
complete visual parity, or the full official Bootstrap test suite. The fixture
does not resolve every font/asset URL through the application's asset mapper.

Before removing compatibility, run the existing legacy contract tests, production
asset generation, authenticated route checks and the broader application suite.
Keep credentials, local environment files, generated assets and screenshots out
of the production commits.

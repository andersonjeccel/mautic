# Temporary Bootstrap 3 jQuery adapter: modal and tooltip

**Opt-in spike, not a complete Bootstrap migration or drop-in Bootstrap 3 runtime.**
All created/modified files are in this directory. No app sources, detector, sibling
fixtures, root dependencies/configuration, original vendor runtime, or Git history
were changed by this adapter task.

## Run

From `/home/anderson/.hermes/workspaces/mautic/bootstrap-compat-7x`:

```bash
bash utils/bootstrap-compat/adapter/run.sh
```

Requires the already-running DDEV web and selenium-chrome containers, installed
root jQuery and `../toolchain/node_modules/bootstrap` (5.3.8), and built original
Mautic CSS. Python stdlib implements the W3C WebDriver client: **actual Chromium,
not jsdom/mocks**, no Selenium Python package needed. `WEBDRIVER_URL` and
`BOOTSTRAP_APP_URL` can override discovery/origin. Harness takes the shared
`bootstrap-compat-selenium.lock` once; do not wrap the command in another flock.
To run one contract without the full-suite report:

```bash
python3 utils/bootstrap-compat/adapter/test_adapter.py Contracts.test_modal_cancellation_bridge
```

`run.sh` expects the complete suite; its report intentionally rejects partial
observations. It writes `logs/final-tests.log`, `logs/observations.json`,
`logs/summary.json`, `TESTS.md`, and regenerated source/runtime provenance here.

## Actual tested domain

29 named tests (exact names in `TESTS.md`), separately loaded candidate and real
Bootstrap **3.4.1** baseline pages, Bootstrap **5.3.8** candidate. No Bootstrap 3 JS
is loaded in candidate. The Bootstrap 5 bundle includes Popper; script/CSS URLs
are local. The normal candidate tests now use the sibling **single compatibility app.css**.
A dedicated integration test checks modal/tooltip visibility and cleanup with that
bundle. The parser-time installation fixture remains a separate raw-BS5 check.
These tests do not establish visual or full-application equivalence.

Coverage includes:

- Modal `.modal()`, options, `show`, `hide`, `toggle`, `handleUpdate`, chainability,
  stable jQuery data and actual native instance identity, repeated init, hidden-only
  disposal, reinit, and foreign native ownership rejection.
- Modal `show/shown/hide/hidden.bs.modal`: order, count, relatedTarget, jQuery
  cancellation, native cancellation, and **one jQuery + one native event**, not
  a second adapter event dispatch. Both plain and real `.fade` transitions.
- Legacy `data-toggle`, `data-target`, `data-dismiss`, `data-show`, `data-keyboard`,
  and static/ordinary backdrop; dynamically inserted modals; opener focus restore.
  Dual legacy/native attributes tested after adapter initialization, with no
  duplicate click handling. The adapter ignores native data-API triggers rather
  than translating attributes or registering their click action a second time.
- Modal focus trap, keyboard=false, mutable options before next opening, and
  **trusted WebDriver click/Tab/Escape actions** with focus restoration.
- Tooltip `show/hide/toggle/destroy/dispose/fixTitle`, chainability, repeated init,
  disposal/reinit, jQuery data, Popper-generated overlay, ARIA cleanup, events and
  cancellation. Visible `destroy` hides first, preserves hide/hidden and cancellation,
  then disposes; repeated destruction during a fade has one completion.
- Tooltip HTML, container body/default parent, left/default/bottom placement,
  manual and default hover/focus trigger, delayed show/hide, function title,
  dynamic elements, title and `data-original-title` refresh, ReportBundle's
  existing `data-bs-placement` consumer.
- Parser-time installation, DOM-ready plugin overwrite protection, inert loading
  without install, repeated install, disabled-jQuery-bridge rejection, local-only
  scripts, and unsupported method/option rejection before initialization.

Browser capabilities, per-page version, loaded resource URLs, browser messages,
and per-contract results are retained in observations. Final suite rejects severe
browser messages (individual test helper exempts favicon errors; full-suite report
rejects them too). The current final observations had no severe messages.

## Explicit installation sequence

```html
<script src="/node_modules/jquery/dist/jquery.js"></script>
<script src="/utils/bootstrap-compat/toolchain/node_modules/bootstrap/dist/js/bootstrap.bundle.js"></script>
<script src="/utils/bootstrap-compat/adapter/adapter.js"></script>
<script>
(async function () {
  // Mautic Core currently restores window.jQuery after noConflict(true).
  const mQuery = window.jQuery;
  await Bootstrap3Compat.install(mQuery, window.bootstrap);
  // Only now load/execute consumers that initialize modals/tooltips.
  mQuery('#example').modal({show: false});
})();
</script>
```

Loading adapter.js alone does nothing. Installation waits for Bootstrap's
DOMContentLoaded optional jQuery plugin registration, then replaces only these
two jQuery plugin entrypoints. It **retains Bootstrap's native optional jQuery
event bridge**, requiring `window.jQuery === supplied mQuery` and no
`body[data-bs-no-jquery]`. Do not remove/change that global or toggle that attribute
after installation. `$` works when it references the same jQuery object. Mautic's
`1.core.js:2-3` performs noConflict(true) then restores window.jQuery=mQuery.
Do not load original `libraries.js` or Bootstrap 3 vendor JS into the candidate.

## Supported API, narrowly

| Plugin | Methods | Initial options/data reads |
|---|---|---|
| modal | show, hide, toggle, handleUpdate, dispose | show boolean, keyboard boolean, backdrop true/false/static |
| tooltip | show, hide, toggle, destroy→dispose, dispose, fixTitle | animation, html, placement top/bottom/left/right, trigger manual/hover/focus/click, container, title string/function, delay number/show-hide object |

Supported keys are read from jQuery's cached legacy data and corresponding
`data-bs-*` keys; legacy keys override native-prefixed keys, explicit options win.
Repeated initialization reuses the record, as Bootstrap 3 does, without replacing
its original options. New object options are still validated on repeated calls.
`data('bs.modal')` provides `options`, read-only `isShown`, and `native`;
`data('bs.tooltip')` provides `options` and `native`. These are **facade records,
not Bootstrap 3 instances**. Modal `options.keyboard/backdrop` mutation is supported
**before the next opening only**, using audited private fields in pinned BS5.

Unknown methods, private method names, and unknown JS option keys throw
`TypeError: Bootstrap3Compat: unsupported ...`. Remote modal loading; custom
selector/template/viewport tooltip options; auto/function placements; enable,
disable, toggleEnabled, and other Bootstrap 3 methods are not implemented.
Foreign pre-existing BS5 instances fail closed instead of creating a second
instance or silently ignoring hide/disposal. Initialize these elements via the
adapter first. `dispose` on an open/transitioning modal fails explicitly: hide,
await hidden, then dispose. Uninitialized tooltip hide/destroy/dispose and hidden
modal uninitialized disposal are no-ops only when no foreign native instance exists.
Tooltip sanitization remains Bootstrap 5's safe default; unsafe sanitization
configuration is not supported. Validation is not a complete schema for every
possible value of supported keys; native Bootstrap type checks still apply.

## Inspected actual Mautic consumers

`source-inventory.json` records file/line/context and representative covering
contracts: **89 matching JS lines across 17 source files**, scanning app/bundles
and plugins. This is regex **triage plus manual inspection**, not an exhaustive
AST analysis, route crawl, or occurrence-level proof.

- Core `9.modals.js:134-151`: mutable `data('bs.modal').options.keyboard/backdrop`.
- Core `1a.content.js:1237-1240`: embedded-form dismissal options; legacy data attrs
  if no instance exists. `:1405-1422`: tooltip existence reads, original-title updates.
- Core `1a.content.js:346-360`: HTML/body tooltips and explicit label hover calls.
- Core `10.entity.js`: tooltip destroy before publishing/replacing status elements.
- Campaign `campaign-event-delete-modal.js:29-34,369`: show:false, keyboard/backdrop,
  object init plus show; `campaign.js:408-423`: hide/destroy and left/body/HTML tips.
- Report `report.js:313-328`: manual trigger, data-bs-placement, title/fixTitle/show/hide.
- Lead/Form/Point/Plugin source: repeated initialization after dynamic content and
  destruction before removal. Email heatmap creates/removes dynamic modals.
- Core templates `Components/modal.html.twig`, `Modal/keyboard_shortcuts.html.twig`,
  `Modal/search_commands.html.twig`, and Theme list use modal fade / legacy dismiss.
  `Components/toggletip.html.twig` has a left-placement tooltip wrapper and a
  **popover** button; the button's data-selector is popover, not tooltip coverage.

## Unresolved differences / contracts not proven

1. **Repeated modal show — corrected**: adapter emits the legacy jQuery show
   notification without reopening or duplicating shown; differential tests pass.
   This supplemental notification is not a native DOM event equivalence claim.
2. **Destroy visible tooltip — corrected**: hide/hidden and cancellation are
   preserved before disposal. Cancelled destroy retains the instance; repeated
   destroy during a fade completes once. Differential and candidate tests pass.
3. Mutating options while already visible does not change the active BS5 modal;
   next-opening configuration is the tested subset. Repeated initialization does
   not implement arbitrary reconfiguration. Direct mutation of tooltip options
   is not a supported contract.
4. BS5 asynchronous transition guards/focus traversal/Popper positioning and
   safe sanitizer can differ from BS3. Exact animation duration, positioning,
   arbitrary nested/stacked modals, focus traversal sequence, and sanitizer markup
   equivalence are not proven. Only declared event/focus/keyboard contracts pass.
5. Native data-API **first** initialization, direct native method calls, removing
   data entries behind the facade, legacy instance private methods/prototype,
   `.Constructor/.DEFAULTS/.noConflict`, and arbitrary event-handler reentrancy are
   not supported. Mixed attributes are tested only after facade init.
6. Legacy `.modal.in` is maintained around normal events and reconciled in a
   microtask after native cancellation. Exotic late-cancelling/reentrant listeners
   and jQuery stopImmediatePropagation are not an event-time equivalence claim.
7. No automatic tooltip data API (BS3 also requires explicit tooltip init).
   Delegated tooltip selectors, remote modal content, all other Bootstrap plugins,
   real AJAX routes, disabled label descendants, and orphan tooltip cleanup when
   consumers incorrectly call destroy on the overlay instead of its trigger are
   not validated. App-wide replacement is **not approved** by this spike.

## TDD evidence and provenance

Preserved logs retain each observed RED before production changes and GREEN full
suite after changes: modal core 02→03b; mutable options 04b→05; legacy data API
06→07; tooltip lifecycle 08→09; titles/data reads 10→11; unsupported API 12→13;
modal disposal 14→15; native cancellation 16→17; data-show 18→19; Report native
placement 21→22b; tooltip ownership 24→25; foreign disposal 26→27; visible-tooltip
ARIA cleanup 28→29. Existing native behavior was characterized without unnecessary
production changes (event bridge, hover/focus/delay, installation, trusted input,
fade, dual-marked handlers). First exploratory 01 and 04 exposed incorrect test
assumptions about the real baseline; corrected baseline-confirmed RED logs remain.
03 and 22 are empty logs from lock-wait timeouts; later runs passed. Another agent's
initial double flock was corrected elsewhere; this harness never imports or edits
detector.py and never double-locks it.

`provenance.json` hashes original BS3, existing jQuery, BS5 bundle/CSS and audited
installed official sources. The source's event-handler trigger and util
getjQuery/defineJQueryPlugin verified the optional bridge behavior; Modal source
verified the pinned private fields, Tooltip source verified title/dispose behavior.
Official website/search retrieval was blocked (403/backend unavailable), recorded
in `official-docs.json`; installed official source plus real baseline/candidate
execution are the normative API evidence here. Baseline is original unmodified
vendor runtime in **separate page loads**, never co-loaded with BS5.

# Bootstrap 5 global single-CSS spike

## Run

From `/home/anderson/.hermes/workspaces/mautic/bootstrap-compat-7x`:

```sh
python3 utils/bootstrap-compat/candidate/build.py
python3 utils/bootstrap-compat/candidate/test_candidate.py
python3 utils/bootstrap-compat/candidate/compare_frozen.py final.json
```

Browser owns the Selenium flock now; **do not wrap these commands in another flock**. An initial attempt timed out when the concurrently updated Browser acquired the same lock inside our outer flock. No comparison data came from that failed attempt.

## Verified domain

The final browser comparison accepts **18/18 original frozen controls, zero reported differences**, against `../bootstrap-compat-artifacts/baseline/observable-initial.json` in the workspace (absolute baseline path is recorded in JSON). All three original fixtures, widths 375/768/1280 and short/long text are exercised. Geometry uses the detector's existing 0.5px tolerance; visual property values, pseudo-content, overflow and node count use its existing exact checks. No baseline was regenerated. Snapshot font checks verify that declared Source Sans 3 and Remix Icon webfonts loaded.

Raw Bootstrap5-plus-Mautic candidate: **0/18 accepted, 18 rejected**. `raw-bootstrap5.css` preserves its actual CSS; `raw-bootstrap5.json` preserves actual browser snapshots/differences and hashes. This initial candidate had Bootstrap 5 global plus original Mautic custom SCSS, but no legacy component differential or `media/css/app.css` application bundle. Its failures therefore include missing legacy component styles and missing application bundle styles, not exclusively Bootstrap 5 reset changes. Intermediate evidence is in `differential-stage.json` and `corrected-stage.json`. Final evidence is `final.json`.

TDD: `tdd-build-red.log` records missing artifact assertion; `tdd-build-green.log` records passing artifact test. `compare_frozen.py` was written before compatibility and failed on the raw candidate; `tdd-observable-red.log` records a repeatable raw gate failure. Final browser gate passes. No manufactured observations or fixture-ID CSS rules.

## One runtime CSS

`app.scss` loads the complete Bootstrap 5.3.8 Sass module globally (not under a wrapper). `_mautic.scss` recreates the original Mautic app.scss import order after excluding the Bootstrap3 framework entrypoint and third-party library bundle. Bootstrap3 variables, Mautic variable overrides, functions and mixins remain in a separate global Sass environment: Bootstrap5 is isolated via `@use`, preventing BS5 symbol values from contaminating legacy custom Sass. All original application SCSS customization imports compile successfully. Remix Icon and the original font faces are included; asset URLs are rewritten to the existing mapped resources. The non-framework `media/css/app.css` application bundle is included in the SAME generated `app.css`. Original application source, assets, dependency locks and baseline files were not edited.

`legacy-reference.scss` compiles ONLY normalize/scaffolding/type/forms/buttons/button-groups/input-groups/panels/wells/modal/tooltip/close source families, not complete Bootstrap3. `differential.cjs` parses CSS using PostCSS and compares exact selector/context/property declarations to BS5, keeping ordered legacy rules, duplicate declarations and conditional contexts. It emits `_differential.scss`, removing 73 exact target matches and retaining 1,011 compatibility declarations. This is a syntactic pruning heuristic, not a proof of cascade equivalence outside the browser-tested domain. The full original mapped CSS is analyzed for rule/declaration/family counts (8,406 rules / 14,589 declarations), not pasted into overrides. `css-manifest.json` records every selected declaration's emit/omit decision and its original Sass source location via the Dart Sass source map.

`_changed-contracts.scss` repairs shared BS5 collisions: original Sass group-size extension behavior, button-group flex/radius/margins, input-group button margin, file-selector-button UA styling, Mautic semantic colors versus BS5 important utilities. Restoring the existing application bundle supplies `.form-buttons` placement. Modal/tooltip legacy markup CSS is emitted from original source families; the JS adapter is owned elsewhere.

## Boundaries / unresolved

- This proves only the original 18 controls, NOT full application migration or visual equivalence for arbitrary DOM.
- Other agent's optional extended matrix is not covered here.
- Modal/tooltip behavior and their visual states are not browser-tested by this candidate runner.
- Chosen, multiselect, colorpicker, emoji, typeahead, datetimepicker, jvectormap and at library styles, plus Bootstrap vertical/stacked library helpers, are excluded. Their consumers need separate tests/compatibility.
- Consumer inventory and removal criteria are incomplete; no blanket unused-rule claims.
- Existing legacy slash-division warnings remain in `build.log`; Dart Sass 1.69.7 compilation succeeds. No root lock changes, commits or pushes.
- Final CSS is intentionally not claimed small: it includes complete BS5, complete Mautic custom SCSS and the application bundle plus targeted legacy differential.

Build-only `bootstrap5.css`, `legacy-reference.css` and its map are analysis artifacts; browser loads ONLY `app.css`.

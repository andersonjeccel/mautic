# Bootstrap 3 to Bootstrap 5 compatibility verification

This directory contains the migration-specific checks for Mautic's single Bootstrap 5 bundle and Bootstrap 3 compatibility adapter.

The checks are complementary. No single report is treated as complete application coverage.

## Required gates

Run from the repository root:

```bash
python3 utils/bootstrap-compat/generate_javascript_compatibility.py
ddev composer generate-assets
python3 -m unittest utils.bootstrap-compat.adapter.test_differential -v
python3 -m unittest utils.bootstrap-compat.adapter.test_adapter -v
python3 -m unittest utils.bootstrap-compat.routes.test_geometry -v
python3 -m unittest utils.bootstrap-compat.routes.test_interactions -v
python3 -m unittest utils.bootstrap-compat.routes.test_semantics -v
python3 -m unittest utils.bootstrap-compat.test_markup_accessibility -v
python3 -m unittest utils.bootstrap-compat.test_migration_coverage -v
python3 utils/bootstrap-compat/migration_coverage.py --strict-semantic
python3 utils/bootstrap-compat/sass_coverage.py
ddev exec php bin/console lint:twig app plugins
```

The browser checks require the DDEV web and Selenium services.

## What each gate proves

- `adapter/test_differential.py` runs identical synthetic scenarios on two isolated pages: official Bootstrap 3.4.1 CSS and JavaScript versus Bootstrap 5.3.8 with the compatibility bridge. It compares observable behavior, including event sequences, cancellation, removed APIs, legacy templates, input state, instance access, mutable defaults, and reinitialization. Oracle sources are pinned in `adapter/reference/sources.json`; this is not the complete upstream QUnit suite.
- `adapter/test_adapter.py` verifies candidate routing, attribute ownership, native constructor ownership, and modern attributes taking precedence over legacy attributes. These candidate-only checks are not proof of legacy behavioral parity.
- `test_minimal_javascript.py` keeps direct class/style/geometry writes out of the translator. Explicitly authorized exceptions live in `adapter/legacy-exceptions.js`; removed Affix and transition helpers retain their licensed official implementations in separate modules. `adapter/production-sources.json` defines the exact production assembly.
- `routes/test_geometry.py` compares current route markup rendered with the frozen legacy stylesheet against the current stylesheet. This is a CSS geometry comparison only. Both sides use the current templates and JavaScript; it is not a Bootstrap 3 runtime or JavaScript baseline.
- `routes/test_interactions.py` exercises only the current migrated runtime on authenticated route captures. Bootstrap 3 interaction parity belongs to the adapter suite, not the route CSS comparison.
- `routes/test_semantics.py` verifies semantic CSS and document contracts such as color modes, reduced motion, print utilities, nested tables, and column positioning.
- `test_markup_accessibility.py` verifies generated markup contracts for close controls, form help/error relationships, input groups, and progress bars.
- `migration_coverage.py` inventories legacy CSS classes, data attributes, and reviewed JavaScript plugin calls in source. It is a static safety net, not a substitute for browser tests.
- `sass_coverage.py` verifies the reviewed legacy Sass symbol surface, compilation, and zero deprecation warnings.

## Generated and sensitive artifacts

Authenticated route HTML can contain application data and short-lived CSRF values. Browser captures, screenshots, logs, caches, installed Node dependencies, and generated comparison directories are ignored by `utils/bootstrap-compat/.gitignore` and must not be committed.

The route tests recreate temporary captures under `routes/runtime/`. Remove that directory after manual audit runs. Use only synthetic or explicitly disposable test data.

Generated reports bind to the scanned source and compiled asset inputs. Regenerate them after source or asset changes; stale reports are not evidence for a newer tree.

## Frozen resources

`frozen/` contains deterministic legacy resources used by the compatibility tests. Their provenance is recorded in `provenance.json` and adapter-specific metadata. Do not refresh them from the migrated application.

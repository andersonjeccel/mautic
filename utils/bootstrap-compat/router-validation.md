# Bootstrap compatibility architecture and validation

## Architecture

Production uses Bootstrap 5.3.8 and the assembly declared in
`adapter/production-sources.json`. The generator joins those sources exactly;
production does not include the complete Bootstrap 3 runtime or its stylesheet.

- `adapter.js`: legacy attributes, options, methods, jQuery calls, mutable
  defaults, instance access, and output interfaces translated to Bootstrap 5.
  Direct class, style, and geometry writes remain outside this translator.
- `legacy-exceptions.js`: explicitly authorized compatibility behavior where
  simple forwarding is insufficient. This includes remote modal loading and
  `loaded.bs.modal`, asynchronous button text/loading/reset states, legacy
  radio/checkbox groups, custom tooltip/popover templates and selectors,
  legacy state aliases, tab parent state, disposal events, and offset-based
  ScrollSpy processing. Existing Bootstrap 5 components remain the rendering
  owners where there is an equivalent component.
- `affix-exception.js` and `transition-exception.js`: the removed official
  Bootstrap 3.4.1 components, kept separately with their original MIT notices.
  Their complete originals are pinned under `adapter/reference/`.

Mirrored attributes track ownership: changing/removing a legacy attribute
updates only its adapter-owned modern counterpart. Explicit modern attributes
win, including an override added after the original legacy attribute was mirrored.

The earlier pure-routing validation document is superseded by this document.
The user explicitly authorized specific implementations beyond routing; these
exceptions are not a general permission to restyle application pages.

## Behavioral oracle

`adapter/test_differential.py` executes identical scenarios on fresh pages:

1. Official Bootstrap 3.4.1 CSS and JavaScript, without the adapter.
2. Bootstrap 5.3.8 CSS and JavaScript with the production compatibility assembly.

The legacy bundle SHA-256 is
`dbd2a35e72edc7d6bde483481a912f1c38aa57fab2747d9b071d317339ee03a2`.
Individual official component source checksums and URLs are recorded in
`adapter/reference/sources.json` and checked by the differential suite.
The existing frozen baseline and other supporting materials remain preserved.

The scenarios are derived from component contracts rather than the Mautic call
inventory. They compare input state, chainability, visibility, event order and
arguments, cancellation, instance access during events, mutable defaults,
per-element options, sanitization, template translation, and reinitialization.
JavaScript console exceptions also fail the suite. Visibility uses rendered
rectangles, not jQuery's measurement of a hidden element's theoretical size.
Boolean observations normalize the legacy initially-unset `isShown` property;
this does not assert equality of private implementation fields.

## Executed validation

- 55 differential scenarios passed with matching legacy/candidate observations.
- 12 candidate routing checks and 4 translator boundary checks passed.
- 9 authenticated route interaction checks passed on the final runtime.
- 27 route geometry and semantic checks passed on the final runtime.
- 21 migration scanner, legacy CSS, and markup checks passed.
- The final route audit rendered 32 routes at three viewports: 96 comparisons,
  no failed captures or renders. This is a rendering audit, not pixel identity.
- DDEV asset generation completed. JavaScript syntax and Git whitespace checks passed.
- Sass validation passed across 72 files with no missing symbols or deprecation warnings.
- Preview JavaScript matches the local production bridge byte-for-byte.
- Production SHA-256: `fe99aaef2e2fa7001f7607f4d77206416cf2e5f46a46ad8224f290a274324849`.
- No Twig or PHP changes relative to `2721a6ed32`.

Synthetic comparison observations are saved locally in
`adapter/logs/differential-results.json`. Authenticated route captures remain
ignored and must not be committed.

## Scope of the evidence

This is a finite differential scenario suite, not the complete official QUnit
suite and not proof of every possible Bootstrap 3 input combination. In
particular, exhaustive viewport geometry parity, all delegated lifecycle
combinations, nested/dynamic ScrollSpy behavior, constructor/prototype extensions,
and combinations of simultaneous transitions need additional contracts before
making a universal compatibility claim. Static scanner reports do not close
those behavioral gaps.

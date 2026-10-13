# NotificationBell

Independent CoreBundle port of `frontend/src/components/spectrum-ui/components/notification-bell.tsx`.

```twig
{% include '@MauticCore/Components/notification-bell.html.twig' with {
    count: 3,
    max: 99,
    size: 'md',
    dot: false,
    ringOnMount: false,
    ariaLabel: 'Inbox',
    announcement: 'Three new messages',
    className: 'inbox-notification'
} only %}
```

`count` is externally controlled and defaults to zero. `max` defaults to 99 and preserves zero. Sizes are `sm`, `md` and `lg`; `dot` selects the dot indicator instead of the capped badge. Optional empty labels and announcements remain empty, while null/undefined restores the count-based fallback. The button always has `type="button"`, matching the original, and its status is a polite live region. The initial indicator is rendered by Twig without waiting for JavaScript.

```javascript
const element = document.querySelector('[data-component="notification-bell"]');
const bell = window.MauticUI.NotificationBell.get(element);
bell.update({count: 4, dot: true});
bell.update({onClick: (event) => event.preventDefault()});
element.addEventListener('mautic:notification-bell:click', (event) => {
    console.log(event.detail.count);
});
```

`update()` also accepts size, max, className, ariaLabel and announcement. `ringOnMount` initializes the first ring only; later changes to that option do not start a ring. An increased count restarts the bell and clapper from zero, while a decrease rolls the number down without starting a new ring. Clicks do not change the controlled count. Controller and gesture handlers initialize once and dispose when the element leaves the document.

## Motion fidelity

The original 900ms bell/clapper keyframes, times and easeInOut interpolation are preserved, including Motion SVG's actual fill-box center origin. Badge/dot scale uses stiffness 500 and damping 22; digit movement/opacity uses 400/30; tap scale uses 500/30. Reduced motion skips exactly the same trajectories as the reference. The runtime contains the imperative Motion DOM engine, not React or its rendering layer.

Presence keys are preserved through reversals: entering indicators revive the matching exiting node, exiting digit instances can become current again, and completed digit exits remain until every pending exit has completed. Inherited `initial=false` suppresses the halo on a dot that was present at initial mount, including `ringOnMount`; this reference behavior is intentionally retained. Exiting and reviving that initial dot changes its Presence context, allowing subsequent halos.

## Verification

- 38 browser tests compare the byte-preserved React source and Twig rendering.
- 878 temporal comparisons cover three sizes, badge/dot, light/dark, reduced motion, mount ring, count increases/decreases, removal, rapid reversals, max changes, size changes and pointer press/release.
- Exact intermediate root/indicator geometry, transforms, colors, text and nested digit/halo transforms/opacity are checked. Screenshots contain no divergent pixels above Pixelmatch threshold 0.05.
- Initial -1/0/1/99/100 counts, max zero, empty labels, live announcements, controlled count, class updates, native Enter/Space, type=button in forms, and removal cleanup are exercised.
- For reproducible seeking, trajectory fixtures use Chromium with `--disable-threaded-animation`, paused Web Animations and a common clock installed after both pages exist. They finish completed animations to preserve normal Presence completion semantics.
- Strict TypeScript, deterministic production build and Mautic PHP CSS/JS minification are checked. A separate normal-Chromium combined-assets probe exercises unpaused ringing, clicks, halo entry and indicator removal.

Run from the worktree's `Assets/components`: `npm run build && npm test`. The workflow generates reference Tailwind CSS before running the suite. The source hash is recorded in `sources-notification-bell.json`; generated CSS and browser artifacts are not product files.

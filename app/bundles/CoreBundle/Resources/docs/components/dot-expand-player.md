# Dot Expand Player

Twig/JavaScript/CSS port of spectrum-ui/components/dot-expand-player.tsx.
Includes the already-ported VoiceVisualizer/VoiceTimer templates and voice CSS
as standalone dependencies, so this branch runs directly on upstream/7.x.

Include @MauticCore/Components/dot-expand-player.html.twig with required src and
label, optional type (default button), className and native attributes. The
button and its owned audio element are adjacent siblings, matching the source
fragment. Keep them together until initialization. Native disabled, name/value,
ARIA, keyboard and form behavior are retained. Explicit caller aria-label wins,
including null, empty text or the same string as the initial label.

```twig
{% include '@MauticCore/Components/dot-expand-player.html.twig' with {
    src: '/recording.wav', label: 'Listen to audio'
} only %}
```

Runtime:

```javascript
const player = MauticUI.DotExpandPlayer.get(button);
player.update({src: '/next.wav', label: translatedLabel});
player.update({onClick: event => handleClick(event), onEnded: handleEnded,
    onPlaybackError: handlePlaybackError});
```

onClick runs before playback; preventDefault cancels the toggle. Ended and error
also emit mautic:dot-expand-player:ended and mautic:dot-expand-player:error
(detail.error). The native audio owns playback/timeupdate/pause/ended/error.
Pending play promises use a generation guard: repeated click, source change,
pause, error, ended or disposal invalidate old attempts. AbortError is ignored;
other current rejections call the error callback. Ended/source change reset time
and UI; ordinary pause preserves elapsed seconds for resume. Disposal disconnects
the ResizeObserver, removes event handlers and the owned sibling audio element.

Content width is measured from hidden label/playing spans using ResizeObserver.
The visible width animates for 300ms, including after label/font changes. The
source hover/active dot expansion, colors, padding, -45-degree icon rotation and
Play/Pause SVG paths are retained. Playing bars stay white in both themes;
measurement bars retain the original neutral colors. Waveform motion and reduced-
motion behavior come from the source VoiceVisualizer seed. Elapsed timer uses
whole native audio seconds. ARIA pause text is translated using a label placeholder.

Run npm run build and npm test in Assets/components. Tests cover intermediate
width/icon/color/bar frames in both themes, 375/1024px and normal/reduced motion;
real PCM WAV playback, pause/resume, time progression and ended reset; actual
media decoding error; pending/stale promise rejections; source replacement while
playing; labels/ARIA/disabled/default type/keyboard/form behavior and cleanup.
Pixelmatch threshold is 0.05; computed visual geometry/styles must match exactly.
Deterministic CSS seeking uses Chromium --disable-threaded-animation; a separate
normal-Chromium PHP-minified probe verifies real playback and live animations.
Production imports only the native lifecycle helper, not React, Lucide or Motion.
These tests establish covered states, not arbitrary external CSS or React trees.

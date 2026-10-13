# Voice Input Family

Twig/CSS/JavaScript reconstruction of the voice-input.tsx source module's three
exports: VoiceInput, VoiceVisualizer and VoiceTimer. It models the original UI
state machine, not a microphone recorder or transcription service.

## VoiceInput

Include @MauticCore/Components/voice-input.html.twig. Omit state for uncontrolled
usage, or pass idle/recording/processing for controlled usage. Pass className for
additional root classes. Actions change internal state and emit bubbling events:
- mautic:voice-input:start
- mautic:voice-input:confirm
- mautic:voice-input:cancel

MauticUI.VoiceInput.get(element).update accepts state and callback functions
onStart/onConfirm/onCancel. Explicit state: undefined releases control; internal
state remembers actions performed while controlled, matching the React source.
The recording clock advances one decisecond per 100ms interval and shows whole
seconds. Cancel/restart resets it; leaving recording clears the interval.
Disposal removes the delegated handler and clears the clock.

All user-visible text and button ARIA labels go through translation. No media
capture or network request is performed by this component.

## VoiceVisualizer

Include voice-visualizer.html.twig with active (default true), barCount (default
18), className and barClassName. It preserves the original fixed 18-bar seed;
counts larger than 18 do not invent bars, and negative counts follow slice rules.
Bar height, delay and duration are deterministic. The su-eq CSS keyframes are
placed inside the visualizer, as in source. Active bars animate scaleY from 0.3
to 1 and back; inactive bars use 0.35 vertical scale. Reduced-motion disables
active bar animations and fixes vertical scale at 0.5, but does not alter inactive
bar scale. Processing uses ten inactive bars with the original spacing/opacity.

## VoiceTimer

Include voice-timer.html.twig with seconds and optional prefix/ariaLabel.
Negative values clamp to zero and fractions floor before m:ss formatting.
Explicit empty ariaLabel is retained; string prefix "0" is not dropped.
The original monospace typography, tabular numbers and light/dark colors are kept.

```twig
{% include '@MauticCore/Components/voice-input.html.twig' with {} only %}
```

The root has the original 44px pill geometry, border, shadow and light/dark
colors. Microphone, cancel and confirm SVG paths come from lucide-react 0.511.0,
matching the local acervo version. Lucide is a development-only reference
fixture dependency; the production bundle contains no React or icon library.

Run npm run build and npm test in Assets/components. The reference suite compares
all states in light/dark themes, normal/reduced motion and 375/1024px widths.
It samples all seeded bar transforms and pixels, checks non-frozen waveform/press
motion, standalone bar counts, timer/ARIA formatting, actual callbacks, native
keyboard focus, controlled release, recording restart and lifecycle cleanup.
Pixelmatch threshold is 0.05. Deterministic CSS-seek tests disable Chromium's
threaded animation path because seeking delayed compositor animations backwards
can leave stale painted transforms despite matching computed styles. A separate
PHP-minified real-browser probe uses normal Chromium animation settings and
checks live waveform movement and interactions. These checks establish covered
states, not arbitrary caller CSS or React component trees.

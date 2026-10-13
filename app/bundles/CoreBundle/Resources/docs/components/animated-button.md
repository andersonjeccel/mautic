# Animated Button

Twig/DOM reconstruction of the Animate UI styled Button and Button primitive.
Include @MauticCore/Components/animated-button.html.twig with children, variant,
size, hoverScale, tapScale, attributes and optional asChild/tag/childAttributes.
Use primitive: true for the unstyled primitive. Native type/name/value/disabled
and related attributes can also be passed directly. Omitted type retains native
form-submit behavior. False HTML boolean attributes are omitted; zero content
and scale targets are retained. Text is translated; captured Twig markup is
supported without unescaping untrusted strings.

Variants are default, accent, destructive, outline, secondary, ghost and link.
Sizes are default (36px), sm (32px), lg (40px), icon (36px), icon-sm (32px),
icon-lg (40px), or null to omit size utilities. Direct SVG children adjust
horizontal padding as in :has(>svg); SVGs without a size- class use 16px geometry.

The Animate UI Slot differs from Radix Slot: parent attributes override child
attributes, including disabled. Child classes precede parent classes. The
selected native tag keeps its semantics. Primitive mode omits styled sizes,
borders, theme fills and focus utilities. No React is included in production.

Motion vanilla hover/press handlers reproduce hoverScale 1.05 and tapScale 0.95.
Press takes priority over hover and returns to the currently active hover/base
state on release/cancel. The original default scale spring uses stiffness 550,
damping 30 and restSpeed 10. A target of zero uses damping 2*sqrt(550), which is
Motion's original critically damped special case. Existing animations are
retargeted without pre-stopping their values or velocity; disposal stops them.
The source does not opt into user reduced-motion handling, so both media
preferences retain these springs.

window.MauticUI.AnimatedButton.get(element).update({hoverScale, tapScale, disabled})
updates the gesture targets. Native DOM listeners handle caller actions. The
CoreBundle content lifecycle mounts and disposes controllers.

Original CSS color/shadow transitions use 150ms cubic-bezier(.4,0,.2,1). The
source's dark destructive background remains 60% alpha on hover due to generated
Tailwind selector precedence. Dark outline and ghost hover use their original
input/accent alpha values. Focus-visible/aria-invalid retain the 3px ring and
source shadow layers.

Run npm run build and npm test in Assets/components. Tests compare all seven
variants/six sizes in both themes, plus hover and keyboard focus states. Twelve
spring configurations compare intermediate geometry, scale, colors, screenshot
frames, interruptions, zero targets and live target updates. Separate real
pointer/keyboard tests verify primitive/Slot behavior, disabled precedence, form
submission and lifecycle cleanup. Pixelmatch threshold is 0.05 and sampled
numeric precision is four decimals. This coverage is explicit, not a universal
claim for arbitrary caller Motion props, CSS or React subtrees.

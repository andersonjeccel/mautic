# Acervo Avatar

Twig/JavaScript reconstruction of shadcn-ui/primitives/avatar.tsx and its Radix
image-loading lifecycle. Original source and Radix implementation hashes are in
tests/reference/sources-avatar.json; the installed Radix implementation was
verified to match the local acervo baseline.

Include @MauticCore/Components/acervo-avatar.html.twig with:
- src, alt, crossOrigin and referrerPolicy for image loading.
- children for fallback text or captured Twig markup (zero is preserved).
- delayMs for fallback delay. Omit it for immediate fallback.
- className, imageClassName and fallbackClassName.
- attributes, imageAttributes and fallbackAttributes for native DOM attributes.
- asChild/childTag/childAttributes/childClassName for the root native tag.
- imageAsChild/imageChildTag/imageChildAttributes/imageChildClassName and the
  corresponding fallback-prefixed properties for the child tags. Child attributes
  take precedence. Native tags are supported; React component objects are not
  executable in Twig. Event listeners are attached using native DOM APIs.

Default tags are span, img and span, matching Radix. The image is absent from the
live DOM until preloading succeeds; template elements hold inert render material.
Fallback is absent after image success. Errors, missing src, changed URLs and
late responses from replaced loaders preserve the current source lifecycle.
Loading status changes emit mautic:avatar:loading-status with detail.status;
status values are idle/loading/loaded/error. No animation exists in the source.

```twig
{% include '@MauticCore/Components/acervo-avatar.html.twig' with {
    src: '/profile.png', alt: 'Profile', children: 'AB', delayMs: 200
} only %}
```

Runtime:

```javascript
const avatar = MauticUI.AcervoAvatar.get(element);
avatar.update({src: '/new-profile.png', alt: 'Updated profile'});
avatar.update({delayMs: 100, onLoadingStatusChange: status => handleStatus(status)});
```

Undefined src clears the image. A fallback already eligible remains eligible
when delay changes. Removing delay before its first timer expires cancels the
timer without making the fallback eligible, matching Radix. Runtime disposal
cancels timers and removes loader callbacks through Core component lifecycle.

The root is a non-shrinking 40px flex circle with clipped overflow; image fills
the circle with square aspect ratio. Fallback centers its content over the
source light/dark muted backgrounds. There is no synthetic image transition.

Tests compare the original React implementation and Twig in a real browser:
8 light/dark and 375/1024px visual cases, image/fallback swap, callback status
sequences, request errors/replacement, real delayed stale responses, timer
retargeting, native asChild tags/attribute precedence, CORS/referrer policy,
escaping, falsy values and disposal. Pixelmatch threshold is 0.05. This coverage
does not imply universal equivalence for arbitrary external CSS or React trees.

Run npm run build and npm test from Assets/components.

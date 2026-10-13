# QuotaBanner

Standalone CoreBundle port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/quota-banner.tsx`.

```twig
{% include '@MauticCore/Components/quota-banner.html.twig' with {
    used: 23,
    limit: 100,
    resetsInSeconds: 3661,
    upgradeLabel: 'Upgrade',
    variant: 'Banner',
    className: 'account-quota'
} only %}
```

`used` and `limit` are required numbers. `variant` defaults to Banner and also supports Compact. Optional resetsInSeconds shows the countdown even at zero; omitting it hides the countdown. Empty/zero-string upgradeLabel is preserved. Labels are escaped, translatable Twig values passed to the native controller.

```javascript
const element = document.querySelector('[data-component="quota-banner"]');
const quota = window.MauticUI.QuotaBanner.get(element);
quota.update({onUpgrade: () => openUpgrade()});
quota.update({used: 81, limit: 100});
quota.update({resetsInSeconds: 65});
quota.update({variant: 'Compact'});
quota.update({resetsInSeconds: undefined});
element.addEventListener('mautic:quota-banner:upgrade', event => {});
```

update accepts all source props, including onUpgrade; unspecified props remain unchanged and undefined optional props restore defaults. Native click/Enter/Space invoke the upgrade callback. The event detail contains used and limit. Banner has role=status and a type=button upgrade action; Compact intentionally has neither role nor action, matching the reference. Track spans retain aria-hidden=true. Inline SVG is the exact source Lucide Zap path, licensed in lucide-ISC.txt.

Countdown state counts 1000ms interval callbacks, not elapsed wall time. Only changing resetsInSeconds resets remaining or replaces its interval: passing the same seconds during usage/variant/label updates does not reset the countdown or its phase. Zero/undefined schedule no interval. Negative and fractional seconds retain the source initial floor/remainder formatting, then decrement with Math.max(0, remaining - 1). A nonzero countdown interval continues at zero, matching the hook. Variant changes preserve remaining; removal clears timers and the click handler. Dynamic instances have separate state. Remounting initializes from the element's server-provided options.

Ratio uses the source Math.min(1, used / limit), without a lower clamp or zero-denominator fallback. Exhaustion uses used >= limit, independently of ratio. Invalid/negative CSS widths preserve Chromium's native rejection behavior, including a previously valid width. Numeric captions preserve React text-node boundaries and use JavaScript number stringification, including fractional and large values.

## Motion and checks

Width transitions are 500ms cubic-bezier(0.23,1,0.32,1), including interrupted and reversed updates. The upgrade button uses the original individual scale and 160ms transform transition. Source animations remain enabled with reduced motion because the source has no override.

Browser comparisons cover light/dark, reduced/no-preference motion, 375/1024 viewports, both variants, changing exhaustion/limits, interrupted width, invalid widths, timers at 999/1000ms, unchanged deadline, replacement/removal/restart, rollover, dynamic independent mounts, cleanup/remount, escaped/empty/zero labels, real pointer/focus, keyboard and no native form submission. Trajectory tests use Chromium --disable-threaded-animation and paused CSS animation currentTime; normal Chromium separately exercises unpaused transitions/countdown with PHP-minified combined assets.

Run `npm run build && npm test` in Assets/components. Reference CSS is a tracked generated Tailwind fixture; regenerate with `npx @tailwindcss/cli -i tests/reference/quota-banner.css -o tests/reference/quota-banner.generated.css` when changing reference source/theme. Source hash is in sources-quota-banner.json. Production contains only local quota-banner.ts and lifecycle.ts, without React/Motion/Lucide runtime dependencies.

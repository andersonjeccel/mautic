# ConversationList

Standalone CoreBundle port of `frontend/src/components/spectrum-ui/components/blocks/ai-assistants/conversation-list.tsx`.

```twig
{% include '@MauticCore/Components/conversation-list.html.twig' with {
    conversations: [{id:'first',title:'Conversation',group:'Today',pinned:true}],
    variant: 'Default',
    className: 'assistant-conversations'
} only %}
```

conversations is required. ConversationEntry fields are unique string id, title, group and optional pinned boolean. Groups retain first occurrence order, including empty/integer-looking/prototype-like names. Default/Compact differ only in source row padding/title size. nav label and Pin/Unpin title patterns use translation. Titles/group strings remain escaped; literal replacement tokens, zero strings and empty titles are not normalized.

```javascript
const element = document.querySelector('[data-component="conversation-list"]');
const list = window.MauticUI.ConversationList.get(element);
list.update({onSelect: id => selectConversation(id), onTogglePin: id => togglePin(id)});
list.update({activeId: 'first'});
list.update({activeId: undefined});
list.update({conversations: updatedConversations, variant: 'Compact'});
```

update supports conversations/activeId/variant/className/onSelect/onTogglePin. Missing or undefined activeId uses local activeState, initially the first conversation id. Defined activeId is controlled, including empty string, missing id or null (none active). Clicks still update local state while controlled; releasing control reveals the last local selection. An initially empty list never auto-selects a later first item. Local selection survives disappearance and restoration of its id.

Pins initialize only at mounting from initial pinned props; metadata updates/new entries do not recompute the Set. Toggles survive replacement arrays, disappearance/restoration, group moves and variant changes. No sorting of pinned rows is invented. Callbacks receive the exact id and run before DOM commit, matching React event batching; internal selected/pinned state is already updated. Bubbling mautic:conversation-list:select and mautic:conversation-list:pin expose {id}. Function callbacks are client configuration, not Twig serialization. Rebind callbacks on a newly mounted controller; root event listeners can remain. Disposal removes delegation and remount rebuilds from server props, resetting local state.

## DOM and motion fidelity

Groups and rows use separate keyed host scopes: moving a conversation to another group remounts its row, while component-level pin/selection state survives. Source lastPlacedIndex host placement is reproduced independently at group/row levels. Hidden template prototypes do not add a margin before the first visible group. Unchanged title/group text hosts are retained for selection. MessageSquare and Pin vector paths/strokes are copied under Lucide ISC; pinned Pin fill follows currentColor. Pin icon has a separate class from the button so it cannot inherit absolute/button grid sizing.

Selection backgrounds and pin opacity/color use the source 150ms cubic-bezier(0.4,0,0.2,1) transition property lists, including intermediate/reverse frames. Active select scale(0.99) and pin scale(0.9) are immediate individual scale changes, not extra transitions. Pin uses source individual translate(0,-50%) and absolute centering. Reduced motion does not remove these transitions, matching the source.

Desktop unpinned controls are opacity-zero until row hover or keyboard focus. Devices without hover show them constantly; normal hover backgrounds/group-hover rules are guarded by (hover:hover), matching Tailwind rather than sticky touch hover. Opacity never removes keyboard access or ARIA. Native type=button, conditional aria-current="true", aria-pressed, literal Pin/Unpin labels and source focus/forced-color ring behavior are retained.

## Verification

33 standalone and 33 integrated browser tests passed. 343 exact temporal/pixel comparisons cover 16 theme/motion/viewport/variant configurations, controlled/uncontrolled release, precommit callback observations, once-only state initialization, disappearance/restoration and group moves, default/compact, group ordering/escaping/empty/zero/literal labels, selection/pin transition trajectories, pointer hover/press/release/reverse, native keyboard/forms/text selection and disposal/remount, forced colors and real no-hover touch capability. No pixel differences above threshold 0.05; geometry, colors/borders/radius, opacity/transforms/scale/translate, SVG paths/strokes/fill and ARIA match React.

Normal unpaused original/native Chromium verifies actual hover/pin opacity, local pins despite prop changes, controlled null/release, focus visibility and both motion preferences. Combined PHP-minified assets run beside earlier controllers with real HTTP font requests and no browser errors. Production includes only lifecycle.ts and conversation-list.ts, with no React/Motion/Lucide runtime imports.

Run npm run build and npm test in Assets/components. Regenerate reference CSS using `npx @tailwindcss/cli -i tests/reference/conversation-list.css -o tests/reference/conversation-list.generated.css`. sources-conversation-list.json records source hash; fonts and icon license are included.

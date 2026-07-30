# Upcoming campaign event actions

## What changed

The contact detail now shows the existing `Reschedule` and `Cancel` controls
beside each upcoming campaign event. They reuse the same permission checks and
AJAX actions already available in the contact timeline.

## Why it helps

Before this change, a person had to leave the visible `Upcoming events` card,
open the contact history, find the same event, and then edit it. The controls
are now available beside the event that needs attention. Rescheduling still
requires a future date, and canceling keeps the existing event state and
permission rules; no campaign is sent or changed by simply opening the page.

## How to verify

1. Open a contact with a future campaign event.
2. In `Upcoming events`, confirm `Reschedule` and `Cancel` are beside the event.
3. Choose `Reschedule`, enter a future date, and press Enter.
4. Confirm the displayed date updates without leaving the contact.
5. Use `Cancel` on another test event and confirm it is no longer scheduled.

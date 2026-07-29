# Action shortcuts

This document records small interface improvements that reduce repeated work.

## 2026-07-29 — clear contact owners in bulk

Before: to leave 10 contacts without an owner, a user had to open each contact,
clear the owner, save, and return to the list: 40 steps. The bulk Change Owner
form only offered users, so the desired “no owner” decision was unavailable.

After: select the contacts, open the bulk actions, choose Change Owner, choose
No owner, and save: 4 steps, a 90% reduction. The choice is explicit and uses
the existing permission checks and save flow.

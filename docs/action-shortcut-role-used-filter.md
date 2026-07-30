# Filter roles used by users

## What changed

The Roles list now offers a `Used by users` quick filter. It uses the existing
role-to-user relationship and keeps the user count visible in each result.

## Why it helps

Before this change, someone auditing access had to open Roles, inspect or sort
the user-count column, and then open the user list for each role that mattered.
Now they can open the quick filters, choose `Used by users`, and review only
roles that are assigned to at least one user. The filter is read-only and can
be cleared with the existing Reset control.

## How to verify

1. Create one role and assign it to a local test user; leave another role unused.
2. Open Users > Roles and open Quick filters.
3. Choose `Used by users` and apply the filter.
4. Confirm that the assigned role remains and the unused role is omitted.

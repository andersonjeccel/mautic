# Configuration search shortcut

The Configuration page now includes a `Find a setting` search above its tabs.
Typing part of a setting name keeps matching sections visible and opens the
first matching section. Clearing the field restores every section.

The search is only a navigation aid. It does not change, save, or submit any
configuration value, and an unsuccessful search leaves the form untouched.

## Test manually

1. Open **Settings > Configuration**.
2. Type a visible setting label, such as `site URL`, in **Find a setting**.
3. Confirm that the matching section opens and non-matching section tabs are
   temporarily hidden.
4. Replace the text with a value that has no match and confirm the status
   message appears.
5. Clear the field and confirm that all sections return.

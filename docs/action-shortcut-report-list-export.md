# Report list CSV export

## Before

To export one report, a user had to open the report, find the export controls
on its detail page, and choose CSV. That was three actions and required leaving
the list context.

## After

The report list shows `Export to CSV` in each row's actions when the user has the
existing report export permission. The link uses the existing export route and
permission check, so it downloads data without changing the report.

The shortcut reduces the path from three actions to one while keeping the
format explicit. Users without export permission do not see the shortcut.

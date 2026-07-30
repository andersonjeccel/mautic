# Report source navigation

## What changed

When a report source is changed, Mautic already refreshes the available columns,
filters, ordering, aggregators and graphs. The editor now opens the `Data` tab
after that refresh, so the next configuration step is visible immediately.

The existing behavior is unchanged: changing the source still clears selections
that do not belong to the new source. The user can return to `Details` or any
other tab at any time, and nothing is saved automatically.

## Before and after

Before, a person selected a new source, waited for the fields to refresh, clicked
`Data`, and then chose columns or filters. The new source was ready, but the
editor stayed on `Details`, adding a repeated navigation step.

Now, selecting a new source opens `Data` after the successful refresh. The
person can continue with the available fields immediately. A short notice in
that tab also states which selections were reset, while the tab navigation
remains available for returning to the report name or description.

## Manual check

1. Open `Reports` and start a new report.
2. Select a data source and confirm the editor remains on `Details` while it loads.
3. After the refresh finishes, confirm `Data` is active and its columns and filters are visible.
4. Return to `Details` and confirm the name and description remain available.
5. Select another source and confirm `Data` opens again after the refresh.

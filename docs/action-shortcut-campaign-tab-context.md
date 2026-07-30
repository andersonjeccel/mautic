# Campaign detail tab context

When a Campaign detail page loads its event statistics, Mautic now keeps the analysis tab that was already selected. The tabs still disappear when the response has no matching data, and the page falls back to the first available tab.

Before this change, the page always returned to Preview after the asynchronous load. A person reviewing Actions, Decisions, or Conditions had to select that tab again after the data finished loading. Now the chosen tab remains open while the content is populated.

To test it locally:

1. Open a local Campaign detail page with event data.
2. Select Actions, Decisions, or Conditions while the event panel loads.
3. Confirm that the selected tab remains active after loading.
4. Confirm that a tab with no returned data is removed and the first available tab is used.

# Integration configuration opens the first invalid tab

When an integration configuration is submitted with an error, the form now
opens the first tab that contains that error. The existing error icon remains
on the tab, and the field keeps its normal validation message.

Previously, a failed save returned to the default Details tab. The person had
to notice the error icon, choose the matching tab, and then find the invalid
field. The form now starts at that tab, reducing the correction path from four
actions to two: submit and correct the highlighted field.

This only changes where the existing form is opened after a failed validation.
It does not save integration settings, authorize a provider, or change the
existing permissions and validation rules.

## Test in the browser

1. Open an installed integration from Configuration.
2. Leave a required integration field empty and submit the form.
3. Confirm that the tab with the validation error is selected automatically.
4. Confirm that the error icon and field-level validation message remain
   visible.

# Form field error tab

When a field in the Form Builder has a validation error inside a secondary
tab, the field modal now opens on the first tab with an error. The existing
error marker and validation message remain visible, and no value is saved
automatically.

Before this change, the modal always opened on General. The user had to read
the error marker, switch to Conditions or Properties, and then correct the
field. The new flow opens the relevant tab immediately while keeping every
other tab and control available.

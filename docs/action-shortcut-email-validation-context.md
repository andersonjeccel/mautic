# Email validation context

When an Email form fails validation in an Advanced field, Mautic now opens the Advanced tab with the error visible. The tab still shows its error marker, and the form is not saved until the person fixes the problem.

Before this change, the form stayed on the Theme tab. The person had to notice the marked tab, open Advanced, and then find the invalid field. Now the failed submission keeps the person in the part of the form that needs attention.

To test it locally:

1. Open Emails and choose New.
2. Choose the Template type and enter a name, subject, and content.
3. In Advanced, enter an invalid From address, then save.
4. Confirm that Advanced is open, the invalid field is visible, and no Email was created.

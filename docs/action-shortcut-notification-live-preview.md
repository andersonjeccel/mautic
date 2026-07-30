# Notification live preview

The Notification editor now updates its web-notification preview while the
message is being written. Heading, message, and button text are reflected
immediately; an empty field returns to the preview placeholder, and an empty
button is hidden.

This is a local preview only. It does not save, publish, send, or change the
notification until the existing form action is submitted.

Before this change, someone had to fill the fields, save, reopen the
notification, and inspect the result. Now the content can be checked while
editing, which removes that save-and-reopen loop.

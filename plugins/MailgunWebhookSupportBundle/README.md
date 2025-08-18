# Mautic plugin for Mailgun Webhook support

Handles permanent failures, spam reports and unsubscribe events sent from Mailgun. This plugin works with **any mailer configuration** - you can use SMTP, Sendmail, or any other mailer for sending emails while still receiving Mailgun webhooks for DNC management.

Make sure to set up your Mailgun webhook to send data to `/mailer/callback` and select the following events:

- **Permanent Failure** (failed events with severity=permanent) → Creates DNC BOUNCED
- **Complained** (spam reports) → Creates DNC BOUNCED  
- **Unsubscribed** (user unsubscribes) → Creates DNC UNSUBSCRIBED

**Note:** Temporary failures (failed events with severity=temporary) are intentionally ignored to allow retry delivery. Only permanent failures that prevent future delivery should create DNC entries.

## Webhook Event Mapping

| Mailgun Event | Severity | DNC Action | DNC Reason Code | Purpose |
|---------------|----------|------------|-----------------|---------|
| `failed` | `permanent` | ✅ Create DNC | 2 (BOUNCED) | Prevent future delivery to invalid addresses |
| `failed` | `temporary` | ❌ Ignore | - | Allow retry delivery for temporary issues |
| `complained` | - | ✅ Create DNC | 2 (BOUNCED) | Prevent delivery to users who marked as spam |
| `unsubscribed` | - | ✅ Create DNC | 1 (UNSUBSCRIBED) | Honor user unsubscribe requests |

## Testing Commands

- `bin/console mailgun:test-all-webhook-types` - Test all 4 webhook scenarios
- `bin/console mailgun:test-failed-webhook` - Test permanent failure processing  
- `bin/console mailgun:test-smtp-with-webhook` - Test webhooks with SMTP mailer
- `bin/console mailgun:debug-webhook` - Debug webhook configuration issues
- `bin/console mailgun:check-config` - Verify Mautic configuration

## Using SMTP with Mailgun Webhooks

This plugin supports a hybrid approach where you can:

- **Send emails via SMTP** (using your own mail server, Gmail, etc.)
- **Receive webhooks from Mailgun** for DNC management

This is useful when:
- You want to use your existing SMTP infrastructure for sending
- You need Mailgun's delivery analytics and webhook capabilities
- You want centralized bounce/complaint management across multiple mail servers

Simply configure your `MAILER_DSN` to use SMTP and set up Mailgun webhooks pointing to `https://yourdomain.com/mailer/callback`.

## How to make a new release

New releases are automatically released when a tag is committed.
The release get's the name of the tag, so make sure to name tags in a semver
compatible format. 
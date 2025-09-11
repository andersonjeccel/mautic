# Mautic plugin for Mailgun Webhook support

Handles permanent failures, spam reports and unsubscribe events sent from Mailgun. This plugin works with SMTP for sending emails while still receiving Mailgun webhooks for DNC management.

Security: Webhook requests must be signed by Mailgun. The plugin validates the HMAC signature included in the request body. Unsigned or invalidly signed requests are rejected with 401 and do not change contact statuses.

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

## Configuration

- Set up your Mailgun webhooks to POST to `https://yourdomain.com/mailer/callback`.
- Open Integrations → Mailgun Webhook Support:
  - Toggle Active to Yes
  - Set “Webhook Signing Key” to your Mailgun Webhook Signing Key

Only the Integration’s “Webhook Signing Key” is used for verification.

## Webhook Examples

### Permanent Failure (Creates DNC - BOUNCED)

```json
{
  "signature": {
    "token": "613337b7a1742d92c4c2555ca7483e0fe22c952c563ff4c99f",
    "timestamp": "1757598411",
    "signature": "de04a19d53aea884fb2e48c8591a8f89231268ea32d024af71642ae0c795d098"
  },
  "event-data": {
    "event": "failed",
    "id": "9rEw5V8HRjabLEHgu6QupQ",
    "timestamp": 1757598410.9787407,
    "log-level": "error",
    "recipient": "permanent@example.com",
    "reason": "bounce",
    "severity": "permanent",
    "delivery-status": {
      "attempt-no": 1,
      "code": 550,
      "message": "5.1.1 The email account that you tried to reach does not exist",
      "enhanced-code": "5.1.1",
      "bounce-type": "hard"
    },
    "user-variables": {
      "mautic_metadata": {
        "permanent@example.com": {
          "emailId": 123
        }
      }
    }
  }
}
```

**Result:** Creates DNC entry for `permanent@example.com` with reason code 2 (BOUNCED) and links it to Mautic email ID 123.

### Temporary Failure (Ignored - No DNC Created)

```json
{
  "signature": {
    "token": "bfb6e2860b8fb0c4760109fc47198b68bea61e8ec43fd56a00",
    "timestamp": "1751479150",
    "signature": "376ff608b7661e7defe147836b14325709d2952da4a293d99e0283a79aea071d"
  },
  "event-data": {
    "id": "Fs7-5t81S2ispqxqDw2U4Q",
    "timestamp": 1521472262.908181,
    "log-level": "warn",
    "event": "failed",
    "reason": "generic",
    "severity": "temporary",
    "recipient": "temporary@example.com",
    "delivery-status": {
      "attempt-no": 1,
      "code": 452,
      "enhanced-code": "4.2.2",
      "message": "4.2.2 The email account that you tried to reach is over quota",
      "retry-seconds": 600
    }
  }
}
```

**Result:** No DNC entry created. This allows Mailgun to retry delivery after the temporary issue is resolved.

### Spam Complaint (Creates DNC - BOUNCED)

```json
{
  "signature": {
    "token": "cc09ebd5e7b8ab6975b1e09014523b60022dc92067598be10a",
    "timestamp": "1751479239",
    "signature": "56ef2473e365fe80fc8c97584ae75bb4d7038d4c18aff73702fb9444b39cf745"
  },
  "event-data": {
    "id": "-Agny091SquKnsrW2NEKUA",
    "timestamp": 1521233123.501324,
    "log-level": "warn",
    "event": "complained",
    "recipient": "spam@example.com",
    "message": {
      "headers": {
        "to": "Spam User <spam@example.com>",
        "message-id": "20110215055645.25246.63817@ampldigital.com",
        "from": "Bob <bob@ampldigital.com>",
        "subject": "Welcome to our newsletter"
      },
      "size": 111
    },
    "user-variables": {
      "mautic_metadata": {
        "spam@example.com": {
          "emailId": 456
        }
      }
    }
  }
}
```

**Result:** Creates DNC entry for `spam@example.com` with reason code 2 (BOUNCED) and links it to Mautic email ID 456.

### Unsubscribed (Creates DNC - UNSUBSCRIBED)

```json
{
  "signature": {
    "token": "a75b70e1bf6b01077a8e4a5994376bf6d5c407556396dccd8d",
    "timestamp": "1751479217",
    "signature": "c61d6a863f0f1f82e69cea58693d579e2d417823726f3337a432731972e28b9a"
  },
  "event-data": {
    "id": "Ase7i2zsRYeDXztHGENqRA",
    "timestamp": 1521243339.873676,
    "log-level": "info",
    "event": "unsubscribed",
    "recipient": "unsubscribed@example.com",
    "message": {
      "headers": {
        "message-id": "20130503182626.18666.16540@ampldigital.com"
      }
    },
    "ip": "50.56.129.169",
    "geolocation": {
      "country": "US",
      "region": "CA",
      "city": "San Francisco"
    },
    "user-variables": {
      "mautic_metadata": {
        "unsubscribed@example.com": {
          "emailId": 789
        }
      }
    }
  }
}
```

**Result:** Creates DNC entry for `unsubscribed@example.com` with reason code 1 (UNSUBSCRIBED) and links it to Mautic email ID 789.

## Email Identification Headers

The plugin uses these methods to track which Mautic email a webhook event came from:

- **`user-variables.emailId`**: Direct email ID (preferred method)
- **`user-variables.mautic_metadata`**: JSON object with email IDs per recipient
- **`message.headers.X-Mailgun-Variables`**: JSON containing `mautic_metadata`

This ensures that bounces, complaints, and unsubscribes are properly attributed to the specific email campaigns in Mautic.

## Testing

Use the built-in test command to verify webhook processing:

```bash
ddev exec bin/console mailgun:test-webhooks
```

This command tests all webhook types:
- Permanent failure (creates DNC)
- Temporary failure (ignored)
- Unsubscribed (creates DNC)
- Complained (creates DNC)

### Manual Webhook Testing

Use the webhook examples above with cURL to test the plugin:

```bash
# Test permanent failure (creates DNC)
curl -X POST https://your-mautic-site.com/mailer/callback \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mailgun/Webhook" \
  -d '{
    "signature": {
      "token": "613337b7a1742d92c4c2555ca7483e0fe22c952c563ff4c99f",
      "timestamp": "1757598411",
      "signature": "de04a19d53aea884fb2e48c8591a8f89231268ea32d024af71642ae0c795d098"
    },
    "event-data": {
      "event": "failed",
      "id": "9rEw5V8HRjabLEHgu6QupQ",
      "timestamp": 1757598410.9787407,
      "log-level": "error",
      "recipient": "permanent@example.com",
      "reason": "bounce",
      "severity": "permanent",
      "delivery-status": {
        "attempt-no": 1,
        "code": 550,
        "message": "5.1.1 The email account that you tried to reach does not exist",
        "enhanced-code": "5.1.1",
        "bounce-type": "hard"
      },
      "user-variables": {
        "mautic_metadata": {
          "permanent@example.com": {
            "emailId": 123
          }
        }
      }
    }
  }'
```

**Testing Instructions:**

1. **Replace URL**: Change `https://your-mautic-site.com` to your actual Mautic domain
2. **Use Examples**: Copy the JSON from the webhook examples section above
3. **Check Recipients**: Ensure test email addresses exist in your Mautic contacts
4. **Verify Results**: Check Mautic's DNC list after sending webhooks
5. **Expected Response**: All webhooks should return `200 OK`

**Quick Test Without Email ID Tracking:**
Remove the `user-variables` section from any example to test basic DNC creation without email identification.

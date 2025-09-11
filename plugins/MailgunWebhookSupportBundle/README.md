# Mautic plugin for Mailgun Webhook support

Handles permanent failures, spam reports and unsubscribe events sent from Mailgun. This plugin works with **any mailer configuration** - you can use SMTP for sending emails while still receiving Mailgun webhooks for DNC management.

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

## Using SMTP with Mailgun Webhooks

- **Receive webhooks from Mailgun** for DNC management

Simply configure your `MAILER_DSN` to use SMTP and set up Mailgun webhooks pointing to `https://yourdomain.com/mailer/callback`.

## Webhook Examples

### Permanent Failure (Creates DNC - BOUNCED)

```json
{
  "signature": {
    "token": "b25f02242b55eeb32b677022a9f21326bca6a6a7957bfc1f87",
    "timestamp": "1751478836",
    "signature": "efab4d02c138cf13ea3a3cc39c16a62a0d0310bd1e5662c61327f702abec0c00"
  },
  "event-data": {
    "id": "G9Bn5sl1TC6nu79C8C0bwg",
    "timestamp": 1521233195.375624,
    "log-level": "error",
    "event": "failed",
    "severity": "permanent",
    "reason": "suppress-bounce",
    "recipient": "alice@example.com",
    "delivery-status": {
      "attempt-no": 1,
      "message": "5.1.1 The email account that you tried to reach does not exist. Please try 5.1.1 double-checking the recipient's email address for typos or 5.1.1 unnecessary spaces. For more information, go to 5.1.1 https://support.google.com/mail/?p=NoSuchUser 6a1803df08f44-6fd7736bba7si145401526d6.333 - gsmtp",
      "code": 550,
      "enhanced-code": "5.1.1",
      "description": "User not found",
      "session-seconds": 0
    },
    "message": {
      "headers": {
        "to": "Alice <alice@example.com>",
        "message-id": "20130503192659.13651.20287@ampldigital.com",
        "from": "Bob <bob@ampldigital.com>",
        "subject": "Welcome to our newsletter",
        "X-Mailgun-Variables": "{\"mautic_metadata\":{\"alice@example.com\":{\"emailId\":123}}}"
      }
    },
    "user-variables": {
      "mautic_metadata": "a:1:{s:17:\"alice@example.com\";a:1:{s:7:\"emailId\";i:123;}}"
    }
  }
}
```

**Result:** Creates DNC entry for `alice@example.com` with reason code 2 (BOUNCED) and links it to Mautic email ID 123.

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
    "recipient": "alice@example.com",
    "delivery-status": {
      "attempt-no": 1,
      "code": 452,
      "enhanced-code": "4.2.2",
      "message": "4.2.2 The email account that you tried to reach is over quota. Please direct 4.2.2 the recipient to 4.2.2 https://support.example.com/mail/?p=422",
      "retry-seconds": 600
    },
    "message": {
      "headers": {
        "to": "Alice <alice@example.com>",
        "message-id": "20130503192659.13651.20287@ampldigital.com",
        "from": "Bob <bob@ampldigital.com>",
        "subject": "Welcome to our newsletter",
        "X-Mailgun-Variables": "{\"mautic_metadata\":{\"alice@example.com\":{\"emailId\":123}}}"
      }
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
    "recipient": "alice@example.com",
    "message": {
      "headers": {
        "to": "Alice <alice@example.com>",
        "message-id": "20110215055645.25246.63817@ampldigital.com",
        "from": "Bob <bob@ampldigital.com>",
        "subject": "Welcome to our newsletter",
        "X-Mailgun-Variables": "{\"mautic_metadata\":{\"alice@example.com\":{\"emailId\":123}}}"
      },
      "size": 111
    },
    "user-variables": {
      "mautic_metadata": "a:1:{s:17:\"alice@example.com\";a:1:{s:7:\"emailId\";i:123;}}"
    }
  }
}
```

**Result:** Creates DNC entry for `alice@example.com` with reason code 2 (BOUNCED) and links it to Mautic email ID 123.

### Unsubscribed (Creates DNC - UNSUBSCRIBED)

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
    "flags": {
      "is-authenticated": true,
      "is-routed": false,
      "is-big": false,
      "is-system-test": false,
      "is-test-mode": false
    },
    "message": {
      "attachments": [],
      "headers": {
        "message-id": "9c57f026361e8c6a3b3b6940704c8f4a@milk4u.org",
        "from": "American Dairy Association North East <schools@milk4u.org>",
        "to": "Development Support <2q3w4e567iu8kjythrbesz@gmail.com>",
        "subject": "Your class can adopt your own COW!"
      },
      "size": 30864
    },
    "storage": {
      "key": "BAABAAEo9OtZdwsIEL5MBrUHJb_EMpzQYw",
      "url": "https://storage-us-east4.api.mailgun.net/v3/domains/ampldigital.com/messages/BAABAAEo9OtZdwsIEL5MBrUHJb_EMpzQYw"
    },
    "log-level": "error",
    "recipient": "2q3w4e567iu8kjythrbesz@gmail.com",
    "recipient-domain": "gmail.com",
    "primary-dkim": "pdk1._domainkey.ampldigital.com",
    "tags": [],
    "reason": "bounce",
    "recipient-provider": "Gmail",
    "severity": "permanent",
    "campaigns": [],
    "delivery-status": {
      "attempt-no": 1,
      "code": 550,
      "message": "5.1.1 The email account that you tried to reach does not exist. Please try\n5.1.1 double-checking the recipient's email address for typos or\n5.1.1 unnecessary spaces. For more information, go to\n5.1.1  https://support.google.com/mail/?p=NoSuchUser d75a77b69052e-4b639dd586bsi7418741cf.389 - gsmtp",
      "description": null,
      "session-seconds": 0.125,
      "enhanced-code": "5.1.1",
      "mx-host": "gmail-smtp-in.l.google.com",
      "certificate-verified": true,
      "tls": true,
      "utf8": true,
      "first-delivery-attempt-seconds": 0.029,
      "bounce-type": "hard"
    },
    "envelope": {
      "sender": "schools@milk4u.org",
      "targets": "2q3w4e567iu8kjythrbesz@gmail.com",
      "transport": "smtp",
      "sending-ip": "204.220.183.28"
    },
    "user-variables": {
      "mautic_metadata": {
        "2q3w4e567iu8kjythrbesz@gmail.com": {
          "emailId": 45
        }
      }
    }
  }
}
```

**Result:** Creates DNC entry for `alice@example.com` with reason code 1 (UNSUBSCRIBED) and links it to Mautic email ID 123.

## Email Identification Headers

The plugin uses these headers to track which Mautic email a webhook event came from:

- **`X-Mailgun-Variables`**: JSON containing `mautic_metadata` with email IDs per recipient
- **`user-variables`**: Serialized PHP data with the same metadata
- **`mautic_metadata`**: Direct metadata header (for Mailgun API)

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

To test webhooks manually with cURL, use the **actual Mailgun webhook format**:

```bash
# Permanent Failure (creates DNC)
curl -X POST https://your-mautic-site.com/mailer/callback \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mailgun/Webhook" \
  -d '{
    "signature": {
      "token": "b25f02242b55eeb32b677022a9f21326bca6a6a7957bfc1f87",
      "timestamp": "1751478836",
      "signature": "efab4d02c138cf13ea3a3cc39c16a62a0d0310bd1e5662c61327f702abec0c00"
    },
    "event-data": {
      "id": "G9Bn5sl1TC6nu79C8C0bwg",
      "timestamp": 1521233195.375624,
      "log-level": "error",
      "event": "failed",
      "severity": "permanent",
      "reason": "suppress-bounce",
      "recipient": "bounce@example.com",
      "delivery-status": {
        "attempt-no": 1,
        "message": "5.1.1 The email account that you tried to reach does not exist",
        "code": 550,
        "enhanced-code": "5.1.1",
        "description": "User not found",
        "session-seconds": 0
      }
    }
  }'

# Unsubscribed (creates DNC)
curl -X POST https://your-mautic-site.com/mailer/callback \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mailgun/Webhook" \
  -d '{
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
      }
    }
  }'

# Spam Complaint (creates DNC)
curl -X POST https://your-mautic-site.com/mailer/callback \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mailgun/Webhook" \
  -d '{
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
          "message-id": "20110215055645.25246.63817@ampldigital.com"
        },
        "size": 111
      }
    }
  }'
```

**Key Points:**

1. **Real Mailgun Format**: This is the exact format Mailgun sends in production
2. **No Metadata Required**: Webhooks work without `user-variables` or email ID tracking
3. **Simple Structure**: Just `signature` and `event-data` fields
4. **Recipient Must Exist**: The recipient email must exist in Mautic contacts

### Troubleshooting

**Issue**: Webhooks return 200 OK but no DNC entries are created
- **Solution**: Ensure the webhook data is wrapped in `event-data` field
- **Check**: Verify the recipient email exists in Mautic contacts
- **Note**: Use the exact Mailgun format shown above - no `user-variables` needed

**Issue**: Webhook not recognized as Mailgun webhook
- **Solution**: Ensure the request goes to `/mailer/callback` endpoint
- **Check**: Verify `Content-Type: application/json` and `User-Agent: Mailgun/Webhook` headers

**Issue**: Temporary failures creating DNC entries
- **Expected**: Temporary failures should be ignored (no DNC created)
- **Check**: Ensure `severity` is set to `"temporary"` in the webhook data

**Issue**: Email ID tracking not working
- **Note**: Email ID tracking requires additional setup in the `WebhookSubscriber`
- **For Testing**: Use the simple format above without metadata
- **For Production**: Configure email metadata headers in outgoing emails

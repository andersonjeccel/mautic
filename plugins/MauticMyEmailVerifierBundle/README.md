# MyEmailVerifier Plugin for Mautic

This plugin integrates MyEmailVerifier's email validation API with Mautic's campaign builder "Has valid email address" condition.

## Features

- **Real-time email validation**: Validates emails using MyEmailVerifier API during campaign execution
- **Configurable rejection policies**: Admin UI with checkboxes to control rejection of catch-all, greylisted, and unknown emails
- **API connectivity testing**: Quick self-test button to verify API key and connectivity
- **Comprehensive logging**: Detailed logging for troubleshooting and monitoring
- **Fail-safe operation**: Falls back gracefully on API errors without blocking campaigns

## Installation

1. Copy the plugin to your `plugins/` directory
2. Clear Mautic cache: `ddev exec bin/console cache:clear`
3. Go to Settings > Plugins and install the "MyEmailVerifier" plugin
4. Configure your API key and validation policies

## Configuration

1. Navigate to **Settings > Plugins > MyEmailVerifier**
2. Enable the plugin
3. Enter your MyEmailVerifier API key
4. Configure rejection policies:
   - **Reject catch-all emails**: Reject emails from domains that accept all addresses
   - **Reject greylisted emails**: Reject emails from domains that don't respond immediately
   - **Reject unknown emails**: Reject emails with unknown validation status
5. Use the **Test API Connectivity** button to verify your configuration

## Usage

Once configured, the plugin automatically validates emails when contacts enter the "Has valid email address" campaign condition. The validation follows this order:

1. Standard Mautic validations (format, characters, MX records)
2. MyEmailVerifier API validation (if basic validations pass)
3. Policy-based rejection based on your configuration

## API Response Handling

The plugin handles all MyEmailVerifier API response statuses:
- **Valid**: Email passes validation
- **Invalid**: Email is rejected
- **Unknown**: Handled based on "Reject unknown" setting
- **Catch All**: Handled based on "Reject catch-all" setting
- **Grey-listed**: Handled based on "Reject greylisted" setting

## Error Handling

The plugin includes comprehensive error handling:
- Network timeouts and connection errors
- Invalid API responses
- API rate limiting
- Authentication errors

All errors are logged but don't prevent campaign execution (fail-safe design).

## Requirements

- Mautic 7.0+
- Valid MyEmailVerifier API key
- Internet connectivity for API calls
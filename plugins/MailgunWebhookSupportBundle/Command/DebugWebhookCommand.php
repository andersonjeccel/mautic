<?php

declare(strict_types=1);

namespace MauticPlugin\MailgunWebhookSupportBundle\Command;

use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'mailgun:debug-webhook',
    description: 'Create a debug webhook endpoint to inspect incoming Mailgun requests'
)]
class DebugWebhookCommand extends Command
{
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('Mailgun Webhook Debug Tool');
        $output->writeln('==========================');
        $output->writeln('');

        $output->writeln('This command will help you debug webhook issues with your production Mailgun setup.');
        $output->writeln('');

        $output->writeln('Step 1: Create a debug webhook endpoint');
        $output->writeln('---------------------------------------');
        $output->writeln('Go to https://webhook.site or https://requestbin.com');
        $output->writeln('Create a new webhook URL and copy it.');
        $output->writeln('');

        $output->writeln('Step 2: Configure Mailgun webhook');
        $output->writeln('----------------------------------');
        $output->writeln('1. Go to your Mailgun dashboard');
        $output->writeln('2. Navigate to Sending > Webhooks');
        $output->writeln('3. Add the webhook URL from step 1 for these events:');
        $output->writeln('   - Permanent Failure (failed events with severity=permanent)');
        $output->writeln('   - Complained (spam complaints)');
        $output->writeln('   - Unsubscribed (user unsubscribes)');
        $output->writeln('');
        $output->writeln('Note: Temporary failures are ignored to allow retry delivery.');
        $output->writeln('');

        $output->writeln('Step 3: Test with a bounce');
        $output->writeln('---------------------------');
        $output->writeln('Send an email to an invalid address like: invalid@example.com');
        $output->writeln('or nonexistent@yourdomain.com (replace with your domain)');
        $output->writeln('');

        $output->writeln('Step 4: Check the webhook data');
        $output->writeln('-------------------------------');
        $output->writeln('Go back to webhook.site/requestbin.com and check:');
        $output->writeln('- What headers Mailgun sends (especially User-Agent)');
        $output->writeln('- What the request body looks like');
        $output->writeln('- What Content-Type is used');
        $output->writeln('');

        $output->writeln('Step 5: Update your Mailgun webhook URL');
        $output->writeln('----------------------------------------');
        $output->writeln('Change your Mailgun webhook URL to: https://yourdomain.com/mailer/callback');
        $output->writeln('(Replace yourdomain.com with your actual domain)');
        $output->writeln('');

        $output->writeln('Step 6: Monitor Mautic logs');
        $output->writeln('---------------------------');
        $output->writeln('Check these logs for any errors:');
        $output->writeln('- var/logs/mautic_dev.log (or mautic_prod.log)');
        $output->writeln('- Web server error logs');
        $output->writeln('');

        $output->writeln('Common Issues:');
        $output->writeln('-------------');
        $output->writeln('1. Wrong webhook URL - Make sure it points to /mailer/callback');
        $output->writeln('2. Plugin not loaded - Run: bin/console debug:container | grep -i mailgun');
        $output->writeln('3. HTTPS/SSL issues - Mailgun requires HTTPS webhooks');
        $output->writeln('4. Firewall/DNS issues - Webhook URL must be publicly accessible');
        $output->writeln('5. Content-Type issues - Webhook should send application/json');
        $output->writeln('');

        $output->writeln('Note: This plugin works with ANY mailer configuration (SMTP, Sendmail, etc.)');
        $output->writeln('You can use SMTP for sending while still receiving Mailgun webhooks for DNC management.');
        $output->writeln('');

        $output->writeln('If you need more help, run these test commands:');
        $output->writeln('bin/console mailgun:test-smtp-with-webhook');
        $output->writeln('bin/console mailgun:test-all-webhook-types');

        return Command::SUCCESS;
    }
}

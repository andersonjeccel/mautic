<?php

declare(strict_types=1);

namespace MauticPlugin\MailgunWebhookSupportBundle\Command;

use Mautic\CoreBundle\Helper\CoreParametersHelper;
use Mautic\CoreBundle\Helper\Dsn\Dsn;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'mailgun:check-config',
    description: 'Check Mautic configuration for Mailgun webhook support'
)]
class CheckConfigCommand extends Command
{
    public function __construct(
        private CoreParametersHelper $coreParametersHelper,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('Mailgun Configuration Check');
        $output->writeln('===========================');
        $output->writeln('');

        // Check mailer DSN
        $mailerDsn = $this->coreParametersHelper->get('mailer_dsn', '');
        $output->writeln('Mailer DSN: '.$mailerDsn);

        if (empty($mailerDsn)) {
            $output->writeln('❌ MAILER_DSN is not configured');
            $output->writeln('   Configure it in your .env file: MAILER_DSN=mailgun+api://KEY:DOMAIN@default?region=us');

            return Command::FAILURE;
        }

        try {
            $dsn    = Dsn::fromString($mailerDsn);
            $scheme = $dsn->getScheme();

            $output->writeln('Mailer scheme: '.$scheme);

            if (!in_array($scheme, ['mailgun+api', 'mailgun+https', 'mailgun'], true)) {
                $output->writeln('❌ Mailer is not configured for Mailgun');
                $output->writeln('   Current scheme: '.$scheme);
                $output->writeln('   Expected: mailgun+api, mailgun+https, or mailgun');

                return Command::FAILURE;
            }

            $output->writeln('✅ Mailer is configured for Mailgun');

            // Check domain and key
            $host = $dsn->getHost();
            $user = $dsn->getUser();

            if ('default' === $host) {
                $output->writeln('❌ Domain not specified in DSN');
                $output->writeln('   Update DSN to include domain: mailgun+api://key:DOMAIN@default');

                return Command::FAILURE;
            }

            $output->writeln('Domain: '.$host);

            if (empty($user)) {
                $output->writeln('❌ API key not specified in DSN');

                return Command::FAILURE;
            }

            $output->writeln('✅ API key is configured');

            // Check region
            $query  = $dsn->getQuery();
            $region = $query['region'] ?? 'us';
            $output->writeln('Region: '.$region);
        } catch (\Exception $e) {
            $output->writeln('❌ Invalid MAILER_DSN format: '.$e->getMessage());

            return Command::FAILURE;
        }

        $output->writeln('');
        $output->writeln('Plugin Status');
        $output->writeln('-------------');

        // Check if our services are registered
        $container = $this->getApplication()->getKernel()->getContainer();

        if ($container->has('MauticPlugin\MailgunWebhookSupportBundle\EventSubscriber\WebhookSubscriber')) {
            $output->writeln('✅ Mailgun Webhook Subscriber is registered');
        } else {
            $output->writeln('❌ Mailgun Webhook Subscriber is NOT registered');
            $output->writeln('   Try running: bin/console cache:clear');
        }

        $output->writeln('');
        $output->writeln('Webhook URL Configuration');
        $output->writeln('------------------------');
        $output->writeln('Your Mailgun webhook URL should be:');

        $siteUrl    = $this->coreParametersHelper->get('site_url', 'https://yourdomain.com');
        $webhookUrl = rtrim($siteUrl, '/').'/mailer/callback';
        $output->writeln($webhookUrl);

        $output->writeln('');
        $output->writeln('Required Mailgun Events:');
        $output->writeln('- bounced');
        $output->writeln('- unsubscribed');
        $output->writeln('- complained');
        $output->writeln('- dropped');

        $output->writeln('');
        $output->writeln('Next Steps:');
        $output->writeln('----------');
        $output->writeln('1. Configure the webhook URL in your Mailgun dashboard');
        $output->writeln('2. Test with: bin/console mailgun:test-webhook-full');
        $output->writeln('3. Send an email to invalid address and check logs');
        $output->writeln('4. Use: bin/console mailgun:debug-webhook for detailed debugging');

        return Command::SUCCESS;
    }
}

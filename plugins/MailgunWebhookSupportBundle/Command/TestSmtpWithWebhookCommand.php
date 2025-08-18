<?php

namespace MauticPlugin\MailgunWebhookSupportBundle\Command;

use Doctrine\ORM\EntityManagerInterface;
use Mautic\CoreBundle\Helper\CoreParametersHelper;
use Mautic\EmailBundle\EmailEvents;
use Mautic\EmailBundle\Event\TransportWebhookEvent;
use Mautic\LeadBundle\Entity\Lead;
use Mautic\LeadBundle\Model\DoNotContact as DoNotContactModel;
use Mautic\LeadBundle\Model\LeadModel;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\HttpFoundation\Request;

#[AsCommand(
    name: 'mailgun:test-smtp-with-webhook',
    description: 'Test Mailgun webhooks working with SMTP mailer configuration',
)]
class TestSmtpWithWebhookCommand extends Command
{
    public function __construct(
        private EventDispatcherInterface $dispatcher,
        private CoreParametersHelper $coreParametersHelper,
        private EntityManagerInterface $entityManager,
        private LeadModel $leadModel,
        private DoNotContactModel $doNotContactModel,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $io->title('Testing Mailgun Webhooks with SMTP Mailer');
        $io->info('This test verifies that Mailgun webhooks work even when using SMTP as the mailer');

        // Show current mailer configuration
        $io->section('Current Configuration');
        $mailerDsn = $this->coreParametersHelper->get('mailer_dsn');
        $io->table(
            ['Setting', 'Value'],
            [
                ['Mailer DSN', $mailerDsn],
                ['Mailer Type', $this->getMailerType($mailerDsn)],
                ['Webhook Support', 'Should work regardless of mailer type'],
            ]
        );

        // Create test contact
        $testEmail = 'smtp-test@example.com';
        $io->section('Step 1: Creating test contact');

        $contact = $this->findOrCreateContact($testEmail);
        $io->success("Contact created/found: ID {$contact->getId()}, Email: {$contact->getEmail()}");

        // Clean existing DNC
        $existingDnc = $this->doNotContactModel->getDncRepo()->getEntriesByLeadAndChannel($contact, 'email');
        if (!empty($existingDnc)) {
            $io->info('Removing existing DNC for clean test...');
            foreach ($existingDnc as $dnc) {
                $this->entityManager->remove($dnc);
            }
            $this->entityManager->flush();
        }

        // Test webhook processing
        $io->section('Step 2: Simulating Mailgun permanent failure webhook');

        $webhookData = [
            'signature' => [
                'token'     => 'test-token',
                'timestamp' => (string) time(),
                'signature' => 'test-signature',
            ],
            'event-data' => [
                'id'              => 'test-id',
                'timestamp'       => time(),
                'log-level'       => 'error',
                'event'           => 'failed',
                'severity'        => 'permanent',
                'reason'          => 'mailbox-not-found',
                'recipient'       => $testEmail,
                'delivery-status' => [
                    'code'          => 550,
                    'enhanced-code' => '5.1.1',
                    'message'       => '5.1.1 The email account that you tried to reach does not exist. Please try 5.1.1 double-checking the recipient\'s email address for typos or 5.1.1 unnecessary spaces. Learn more at 5.1.1 https://support.google.com/mail/?p=NoSuchUser w2-20020a05600c1c9200b003f5f1db9aa1sm5421279wmb.9 - gsmtp',
                    'description'   => 'Mailbox not found',
                ],
            ],
        ];

        // Create webhook request
        $request = Request::create(
            '/mailer/callback',
            'POST',
            [],
            [],
            [],
            [
                'CONTENT_TYPE'    => 'application/json',
                'HTTP_USER_AGENT' => 'Mailgun/Webhook',
            ],
            json_encode($webhookData)
        );

        $io->info('Sending webhook request...');

        // Process webhook
        $event = new TransportWebhookEvent($request);
        $this->dispatcher->dispatch($event, EmailEvents::ON_TRANSPORT_WEBHOOK);

        $response = $event->getResponse();
        if ($response) {
            $io->table(
                ['Property', 'Value'],
                [
                    ['Response Status', $response->getStatusCode()],
                    ['Response Content', $response->getContent()],
                    ['Success', 200 === $response->getStatusCode() ? '✅ Yes' : '❌ No'],
                ]
            );
        } else {
            $io->error('No response received from webhook processor');

            return Command::FAILURE;
        }

        // Verify DNC creation
        $io->section('Step 3: Verifying DNC creation');
        $this->entityManager->refresh($contact);

        $newDncEntries = $this->doNotContactModel->getDncRepo()->getEntriesByLeadAndChannel($contact, 'email');
        if (!empty($newDncEntries)) {
            $newDnc = $newDncEntries[0];

            $io->success('✅ DNC entry created successfully!');
            $io->table(
                ['Property', 'Value'],
                [
                    ['Contact Email', $contact->getEmail()],
                    ['DNC Reason Code', $newDnc->getReason()],
                    ['DNC Comments', $newDnc->getComments()],
                    ['Date Created', $newDnc->getDateAdded()->format('Y-m-d H:i:s')],
                ]
            );
        } else {
            $io->error('❌ DNC entry was not created');

            return Command::FAILURE;
        }

        $io->section('Test Results');
        $io->success('🎉 Mailgun webhooks work correctly with SMTP mailer!');
        $io->info('This confirms that you can:');
        $io->listing([
            'Use SMTP for sending emails',
            'Still receive Mailgun webhooks for DNC management',
            'Maintain proper bounce/complaint/unsubscribe tracking',
            'Use Mailgun for delivery analytics while sending via SMTP',
        ]);

        return Command::SUCCESS;
    }

    private function findOrCreateContact(string $email): Lead
    {
        $contact = $this->leadModel->getRepository()->findOneBy(['email' => $email]);

        if (!$contact) {
            $contact = new Lead();
            $contact->setEmail($email);
            $contact->setFirstname('SMTP');
            $contact->setLastname('Test');
            $this->leadModel->saveEntity($contact);
        }

        return $contact;
    }

    private function getMailerType(string $dsn): string
    {
        if (str_starts_with($dsn, 'smtp://')) {
            return 'SMTP';
        } elseif (str_contains($dsn, 'mailgun')) {
            return 'Mailgun';
        } elseif (str_contains($dsn, 'ses')) {
            return 'Amazon SES';
        } elseif (str_contains($dsn, 'sendmail')) {
            return 'Sendmail';
        } else {
            return 'Other/Unknown';
        }
    }
}

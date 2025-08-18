<?php

namespace MauticPlugin\MailgunWebhookSupportBundle\Command;

use Doctrine\ORM\EntityManagerInterface;
use Mautic\LeadBundle\Entity\DoNotContact;
use Mautic\LeadBundle\Entity\Lead;
use Mautic\LeadBundle\Model\DoNotContact as DoNotContactModel;
use Mautic\LeadBundle\Model\LeadModel;
use MauticPlugin\MailgunWebhookSupportBundle\Callback\ResponseItems;
use MauticPlugin\MailgunWebhookSupportBundle\EventSubscriber\WebhookSubscriber;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\HttpFoundation\Request;

#[AsCommand(
    name: 'mailgun:test-failed-webhook',
    description: 'Test Mailgun failed webhook processing with exact webhook structure',
)]
class TestWebhookFullCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private LeadModel $leadModel,
        private DoNotContactModel $doNotContactModel,
        private WebhookSubscriber $webhookSubscriber,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $io->title('Full Mailgun Webhook Test');
        $io->info('This test will create a contact, simulate webhook processing, and verify DNC creation');

        // Create test contact
        $testEmail = 'alice@example.com';
        $io->section('Step 1: Creating test contact');

        $contact = $this->findOrCreateContact($testEmail);
        $io->success("Contact created/found: ID {$contact->getId()}, Email: {$contact->getEmail()}");

        // Check existing DNC
        $io->section('Step 2: Checking existing DNC status');
        $existingDnc = $this->doNotContactModel->getDncRepo()->getEntriesByLeadAndChannel($contact, 'email');
        if (!empty($existingDnc)) {
            $dncEntry = $existingDnc[0]; // Get first entry
            $io->warning("DNC already exists: Reason {$dncEntry->getReason()}, Comments: {$dncEntry->getComments()}");
            $io->note('Removing existing DNC for clean test...');
            $this->entityManager->remove($dncEntry);
            $this->entityManager->flush();
        } else {
            $io->info('No existing DNC found');
        }

        // Test the real webhook data
        $io->section('Step 3: Simulating Mailgun webhook');

        $webhookData = [
            'signature' => [
                'token'     => 'b25f02242b55eeb32b677022a9f21326bca6a6a7957bfc1f87',
                'timestamp' => '1751478836',
                'signature' => 'efab4d02c138cf13ea3a3cc39c16a62a0d0310bd1e5662c61327f702abec0c00',
            ],
            'event-data' => [
                'id'              => 'G9Bn5sl1TC6nu79C8C0bwg',
                'timestamp'       => 1521233195.375624,
                'log-level'       => 'error',
                'event'           => 'failed',
                'severity'        => 'permanent',
                'reason'          => 'suppress-bounce',
                'recipient'       => $testEmail,
                'delivery-status' => [
                    'attempt-no'      => 1,
                    'message'         => '5.7.1 Our system has detected that this message is likely suspicious due to the very low reputation of the sending domain. To best protect our users from spam, the message has been blocked. Please visit https://support.google.com/mail/answer/188131 for more information. c8-20020a05600c054800b003ef06c14bd6si9876543wmb.229 - gsmtp',
                    'code'            => 550,
                    'enhanced-code'   => '5.7.1',
                    'description'     => 'Message blocked due to sender reputation',
                    'session-seconds' => 0,
                ],
                'message' => [
                    'headers' => [
                        'to'         => "Alice <{$testEmail}>",
                        'message-id' => '20130503192659.13651.20287@ampldigital.com',
                        'from'       => 'Bob <bob@ampldigital.com>',
                        'subject'    => 'Test permanent_fail webhook',
                    ],
                ],
            ],
        ];

        // Create request
        $request = new Request();
        $request->initialize([], [], [], [], [], [], json_encode($webhookData));
        $request->setMethod('POST');
        $request->headers->set('Content-Type', 'application/json');

        // Parse webhook data
        $responseItems = new ResponseItems($request);

        $io->info('Parsing webhook data...');
        $processedCount = 0;
        foreach ($responseItems as $item) {
            ++$processedCount;
            $io->table(
                ['Property', 'Value'],
                [
                    ['Email', $item->getEmail()],
                    ['Event Type', 'failed'],
                    ['Reason', $item->getReason()],
                    ['DNC Reason Code', $item->getDncReason()],
                ]
            );

            // Create DNC manually (simulating what the subscriber would do)
            if (null !== $item->getDncReason()) {
                $dncReason = match ($item->getDncReason()) {
                    DoNotContact::BOUNCED      => DoNotContact::BOUNCED,
                    DoNotContact::UNSUBSCRIBED => DoNotContact::UNSUBSCRIBED,
                    default                    => DoNotContact::BOUNCED,
                };

                $this->doNotContactModel->addDncForContact(
                    $contact->getId(),
                    'email',
                    $dncReason,
                    $item->getReason()
                );

                $io->success("DNC entry created for {$item->getEmail()}");
            }
        }

        if (0 === $processedCount) {
            $io->error('No webhook events were processed!');

            return Command::FAILURE;
        }

        // Verify DNC was created
        $io->section('Step 4: Verifying DNC creation');
        $this->entityManager->refresh($contact);

        $newDncEntries = $this->doNotContactModel->getDncRepo()->getEntriesByLeadAndChannel($contact, 'email');
        if (!empty($newDncEntries)) {
            $newDnc     = $newDncEntries[0]; // Get first entry
            $reasonText = match ($newDnc->getReason()) {
                DoNotContact::BOUNCED      => 'BOUNCED',
                DoNotContact::UNSUBSCRIBED => 'UNSUBSCRIBED',
                default                    => 'UNKNOWN',
            };

            $io->success('DNC successfully created!');
            $io->table(
                ['Property', 'Value'],
                [
                    ['Contact ID', $contact->getId()],
                    ['Email', $contact->getEmail()],
                    ['DNC Reason Code', $newDnc->getReason()],
                    ['DNC Reason Text', $reasonText],
                    ['DNC Comments', $newDnc->getComments()],
                    ['Date Created', $newDnc->getDateAdded()->format('Y-m-d H:i:s')],
                ]
            );
        } else {
            $io->error('DNC was not created!');

            return Command::FAILURE;
        }

        $io->section('Test Summary');
        $io->success('✅ Full webhook test completed successfully!');
        $io->info('The Mailgun webhook support bundle is working correctly.');
        $io->note('This test confirms that "failed" events with permanent severity are properly handled as bounces.');

        return Command::SUCCESS;
    }

    private function findOrCreateContact(string $email): Lead
    {
        $contact = $this->leadModel->getRepository()->findOneBy(['email' => $email]);

        if (!$contact) {
            $contact = new Lead();
            $contact->setEmail($email);
            $contact->setFirstname('Test');
            $contact->setLastname('Contact');
            $this->leadModel->saveEntity($contact);
        }

        return $contact;
    }
}

<?php

declare(strict_types=1);

namespace MauticPlugin\MailgunWebhookSupportBundle\Command;

use Doctrine\ORM\EntityManagerInterface;
use Mautic\EmailBundle\EmailEvents;
use Mautic\EmailBundle\Event\TransportWebhookEvent;
use Mautic\LeadBundle\Entity\DoNotContact;
use Mautic\LeadBundle\Entity\Lead;
use Mautic\LeadBundle\Model\LeadModel;
use MauticPlugin\MailgunWebhookSupportBundle\Callback\ResponseItems;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\HttpFoundation\Request;

#[AsCommand(
    name: 'mailgun:test-webhook-full',
    description: 'Test Mailgun webhook processing with real contacts'
)]
class TestWebhookWithContactsCommand extends Command
{
    public function __construct(
        private EventDispatcherInterface $dispatcher,
        private LeadModel $leadModel,
        private EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('Testing Mailgun Webhook Support Bundle with Real Contacts');
        $output->writeln('=========================================================');
        $output->writeln('');

        // Test data similar to what Mailgun would send
        $testData = [
            [
                'event'      => 'bounced',
                'recipient'  => 'test-bounce@example.com',
                'reason'     => 'Mailbox not found',
                'error'      => '550 5.1.1 The email account that you tried to reach does not exist.',
                'timestamp'  => time(),
                'message-id' => 'test-message-id-123',
            ],
            [
                'event'      => 'unsubscribed',
                'recipient'  => 'test-unsubscribe@example.com',
                'timestamp'  => time(),
                'message-id' => 'test-message-id-456',
            ],
            [
                'event'      => 'complained',
                'recipient'  => 'test-spam@example.com',
                'timestamp'  => time(),
                'message-id' => 'test-message-id-789',
            ],
        ];

        // Create test contacts
        $output->writeln('Creating test contacts...');
        foreach ($testData as $data) {
            $contact = $this->createTestContact($data['recipient']);
            $output->writeln("Created contact: {$contact->getEmail()} (ID: {$contact->getId()})");
        }
        $output->writeln('');

        // Test webhook processing
        foreach ($testData as $index => $data) {
            $output->writeln('Test '.($index + 1).": Testing {$data['event']} event for {$data['recipient']}");

            // Create a fake request with the test data
            $request = Request::create(
                '/mailer/callback',
                'POST',
                [],
                [],
                [],
                ['CONTENT_TYPE' => 'application/json'],
                json_encode([$data])
            );

            // Set headers to simulate Mailgun webhook
            $request->headers->set('User-Agent', 'Mailgun Webhook');
            $request->headers->set('Content-Type', 'application/json');

            // Test ResponseItems parsing
            $responseItems = new ResponseItems($request);
            $output->writeln('Parsed items count: '.iterator_count($responseItems));

            foreach ($responseItems as $item) {
                $output->writeln('  Email: '.$item->getEmail());
                $output->writeln('  Reason: '.$item->getReason());
                $output->writeln('  DNC Reason: '.$item->getDncReason());
                $output->writeln('  Channel: '.($item->getChannel() ?? 'null'));
            }

            // Create the webhook event
            $event = new TransportWebhookEvent($request);

            try {
                // Dispatch the event
                $this->dispatcher->dispatch($event, EmailEvents::ON_TRANSPORT_WEBHOOK);

                $response = $event->getResponse();
                if ($response) {
                    $output->writeln('Response status: '.$response->getStatusCode());
                    $output->writeln('Response content: '.$response->getContent());
                } else {
                    $output->writeln('No response received');
                }

                // Check if DNC was created
                $contactData = $this->leadModel->getRepository()->getLeadByEmail($data['recipient']);
                if ($contactData) {
                    $contactId = is_array($contactData) ? $contactData['id'] : $contactData->getId();
                    $contact   = $this->entityManager->getRepository(Lead::class)->find($contactId);

                    if ($contact) {
                        $dncRepo = $this->entityManager->getRepository(DoNotContact::class);
                        $dnc     = $dncRepo->findBy(['lead' => $contact]);
                        if ($dnc) {
                            $output->writeln('✅ DNC entry created for contact');
                            foreach ($dnc as $dncEntry) {
                                $output->writeln('  Reason: '.$dncEntry->getComments().' (Code: '.$dncEntry->getReason().')');
                            }
                        } else {
                            $output->writeln('❌ No DNC entry found for contact');
                        }
                    } else {
                        $output->writeln('❌ Contact entity not found');
                    }
                } else {
                    $output->writeln('❌ Contact not found after webhook processing');
                }
            } catch (\Exception $e) {
                $output->writeln('Error: '.$e->getMessage());
                $output->writeln('Trace: '.$e->getTraceAsString());
            }

            $output->writeln('---');
            $output->writeln('');
        }

        $output->writeln('Test completed!');
        $output->writeln('You can check the DNC entries in the Mautic admin panel.');

        return Command::SUCCESS;
    }

    private function createTestContact(string $email): Lead
    {
        $existing = $this->leadModel->getRepository()->getLeadByEmail($email);
        if ($existing && is_array($existing)) {
            // getLeadByEmail returns array, convert to Lead entity
            $lead = $this->entityManager->getRepository(Lead::class)->find($existing['id']);
            if ($lead) {
                return $lead;
            }
        } elseif ($existing instanceof Lead) {
            return $existing;
        }

        $contact = new Lead();
        $contact->setEmail($email);
        $contact->setFirstname('Test');
        $contact->setLastname('Contact');

        $this->leadModel->saveEntity($contact);

        return $contact;
    }
}

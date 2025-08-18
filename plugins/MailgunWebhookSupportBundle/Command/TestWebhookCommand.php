<?php

declare(strict_types=1);

namespace MauticPlugin\MailgunWebhookSupportBundle\Command;

use Mautic\EmailBundle\EmailEvents;
use Mautic\EmailBundle\Event\TransportWebhookEvent;
use MauticPlugin\MailgunWebhookSupportBundle\Callback\ResponseItems;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\HttpFoundation\Request;

#[AsCommand(
    name: 'mailgun:test-webhook',
    description: 'Test Mailgun webhook processing'
)]
class TestWebhookCommand extends Command
{
    public function __construct(
        private EventDispatcherInterface $dispatcher,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('Testing Mailgun Webhook Support Bundle');
        $output->writeln('=====================================');
        $output->writeln('');

        // Test data similar to what Mailgun would send
        $testData = $this->getTestWebhookData();

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
            } catch (\Exception $e) {
                $output->writeln('Error: '.$e->getMessage());
                $output->writeln('Trace: '.$e->getTraceAsString());
            }

            $output->writeln('---');
            $output->writeln('');
        }

        $output->writeln('Test completed!');

        return Command::SUCCESS;
    }

    private function getTestWebhookData(): array
    {
        return [
            [
                'event'     => 'complained',
                'recipient' => 'test-complaint@example.com',
                'reason'    => 'Spam complaint received',
            ],
            [
                'event'     => 'unsubscribed',
                'recipient' => 'test-unsubscribe@example.com',
                'reason'    => 'User requested unsubscribe',
            ],
            [
                'event'     => 'failed',
                'severity'  => 'permanent',
                'recipient' => 'test-permanent-fail@example.com',
                'reason'    => 'suppress-bounce',
            ],
            [
                'event'     => 'failed',
                'severity'  => 'temporary',
                'recipient' => 'test-temporary-fail@example.com',
                'reason'    => 'mailbox over quota',
            ],
        ];
    }
}

<?php

namespace MauticPlugin\MailgunWebhookSupportBundle\Command;

use MauticPlugin\MailgunWebhookSupportBundle\Callback\ResponseItems;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\HttpFoundation\Request;

#[AsCommand(
    name: 'mailgun:test-real-webhook',
    description: 'Test the exact webhook data structure from Mailgun',
)]
class TestRealWebhookCommand extends Command
{
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $io->title('Testing Real Mailgun Webhook Data');

        // The exact webhook data structure from Mailgun
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
                'delivery-status' => [
                    'attempt-no'      => 1,
                    'message'         => '',
                    'code'            => 605,
                    'enhanced-code'   => '',
                    'description'     => 'Not delivering to previously bounced address',
                    'session-seconds' => 0,
                ],
                'flags' => [
                    'is-routed'        => false,
                    'is-authenticated' => true,
                    'is-system-test'   => false,
                    'is-test-mode'     => false,
                ],
                'envelope' => [
                    'sender'    => 'bob@ampldigital.com',
                    'transport' => 'smtp',
                    'targets'   => 'alice@example.com',
                ],
                'message' => [
                    'headers' => [
                        'to'         => 'Alice <alice@example.com>',
                        'message-id' => '20130503192659.13651.20287@ampldigital.com',
                        'from'       => 'Bob <bob@ampldigital.com>',
                        'subject'    => 'Test permanent_fail webhook',
                    ],
                    'attachments' => [],
                    'size'        => 111,
                ],
                'recipient'        => 'alice@example.com',
                'recipient-domain' => 'example.com',
                'storage'          => [
                    'url' => 'https://se.api.mailgun.net/v3/domains/ampldigital.com/messages/message_key',
                    'key' => 'message_key',
                ],
                'campaigns' => [],
                'tags'      => [
                    'my_tag_1',
                    'my_tag_2',
                ],
                'user-variables' => [
                    'my_var_1' => 'Mailgun Variable #1',
                    'my-var-2' => 'awesome',
                ],
            ],
        ];

        $io->info('Testing webhook data parsing...');

        // Create a fake request with the webhook data
        $request = new Request();
        $request->initialize([], [], [], [], [], [], json_encode($webhookData));

        // Parse the webhook data
        $responseItems = new ResponseItems($request);

        $processedCount = 0;
        foreach ($responseItems as $item) {
            ++$processedCount;

            $io->section("Processed Webhook Event #{$processedCount}");
            $io->table(
                ['Property', 'Value'],
                [
                    ['Email', $item->getEmail()],
                    ['Event Type', 'failed'],
                    ['Reason', $item->getReason()],
                    ['DNC Reason Code', $item->getDncReason()],
                    ['Channel', $item->getChannel() ?? 'email (default)'],
                ]
            );
        }

        if (0 === $processedCount) {
            $io->error('No webhook events were processed! Check the parsing logic.');

            return Command::FAILURE;
        }

        $io->success("Successfully processed {$processedCount} webhook event(s)");
        $io->note('This webhook would create a DNC entry for alice@example.com with reason code 2 (BOUNCED)');

        return Command::SUCCESS;
    }
}

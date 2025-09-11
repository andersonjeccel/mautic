<?php

declare(strict_types=1);

namespace MauticPlugin\MailgunWebhookSupportBundle\Command;

use MauticPlugin\MailgunWebhookSupportBundle\Callback\ResponseItems;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\HttpFoundation\Request;

#[AsCommand(
    name: 'mailgun:test-webhooks',
    description: 'Test all Mailgun webhook types: permanent failure, temporary failure, unsubscribed, complained',
)]
final class TestWebhooksCommand extends Command
{
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $io->title('Testing Mailgun Webhooks');
        $io->info('Testing all essential webhook types: permanent failure, temporary failure, unsubscribed, complained');

        $webhookTests = $this->getWebhookTestData();

        foreach ($webhookTests as $index => $testData) {
            $testNumber = $index + 1;
            $io->section("Test {$testNumber}: {$testData['title']}");

            $request = new Request();
            $request->initialize([], [], [], [], [], [], json_encode($testData['webhook']));
            $request->setMethod('POST');
            $request->headers->set('Content-Type', 'application/json');

            $responseItems = new ResponseItems($request);

            $processedCount = 0;
            foreach ($responseItems as $item) {
                ++$processedCount;

                $io->table(
                    ['Property', 'Value'],
                    [
                        ['Email', $item->getEmail()],
                        ['Event Type', $testData['webhook']['event-data']['event']],
                        ['Severity', $testData['webhook']['event-data']['severity'] ?? 'N/A'],
                        ['Reason', $item->getReason()],
                        ['DNC Reason Code', $item->getDncReason() ?? 'None (not processed)'],
                        ['Expected Behavior', $testData['expected']],
                    ]
                );
            }

            if (0 === $processedCount && $testData['should_process']) {
                $io->error('Webhook should have been processed but was not!');
            } elseif ($processedCount > 0 && ! $testData['should_process']) {
                $io->error('Webhook should NOT have been processed but was!');
            } elseif ($processedCount > 0 && $testData['should_process']) {
                $io->success('✅ Webhook processed correctly');
            } else {
                $io->info('✅ Webhook correctly ignored (temporary failure)');
            }

            $io->writeln('');
        }

        $io->success('All webhook types tested!');
        $io->note('Only permanent failures, complaints, and unsubscribes should create DNC entries.');
        $io->note('Temporary failures should be ignored to allow retry delivery.');

        return Command::SUCCESS;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function getWebhookTestData(): array
    {
        return [
            [
                'title' => 'Permanent Failure (should create DNC)',
                'should_process' => true,
                'expected' => 'Creates DNC with reason code 2 (BOUNCED)',
                'webhook' => [
                    'signature' => [
                        'token' => 'b25f02242b55eeb32b677022a9f21326bca6a6a7957bfc1f87',
                        'timestamp' => '1751478836',
                        'signature' => 'efab4d02c138cf13ea3a3cc39c16a62a0d0310bd1e5662c61327f702abec0c00',
                    ],
                    'event-data' => [
                        'id' => 'G9Bn5sl1TC6nu79C8C0bwg',
                        'timestamp' => 1521233195.375624,
                        'log-level' => 'error',
                        'event' => 'failed',
                        'severity' => 'permanent',
                        'reason' => 'suppress-bounce',
                        'recipient' => 'alice@example.com',
                        'delivery-status' => [
                            'attempt-no' => 1,
                            'message' => '5.1.1 The email account that you tried to reach does not exist. Please try 5.1.1 double-checking the recipient\'s email address for typos or 5.1.1 unnecessary spaces. For more information, go to 5.1.1 https://support.google.com/mail/?p=NoSuchUser 6a1803df08f44-6fd7736bba7si145401526d6.333 - gsmtp',
                            'code' => 550,
                            'enhanced-code' => '5.1.1',
                            'description' => 'User not found',
                            'session-seconds' => 0,
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Temporary Failure (should NOT create DNC)',
                'should_process' => false,
                'expected' => 'Should be ignored - allows retry delivery',
                'webhook' => [
                    'signature' => [
                        'token' => 'bfb6e2860b8fb0c4760109fc47198b68bea61e8ec43fd56a00',
                        'timestamp' => '1751479150',
                        'signature' => '376ff608b7661e7defe147836b14325709d2952da4a293d99e0283a79aea071d',
                    ],
                    'event-data' => [
                        'id' => 'Fs7-5t81S2ispqxqDw2U4Q',
                        'timestamp' => 1521472262.908181,
                        'log-level' => 'warn',
                        'event' => 'failed',
                        'reason' => 'generic',
                        'severity' => 'temporary',
                        'recipient' => 'alice@example.com',
                        'delivery-status' => [
                            'attempt-no' => 1,
                            'code' => 452,
                            'enhanced-code' => '4.2.2',
                            'message' => '4.2.2 The email account that you tried to reach is over quota. Please direct 4.2.2 the recipient to 4.2.2 https://support.example.com/mail/?p=422',
                            'retry-seconds' => 600,
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Unsubscribe (should create DNC)',
                'should_process' => true,
                'expected' => 'Creates DNC with reason code 1 (UNSUBSCRIBED)',
                'webhook' => [
                    'signature' => [
                        'token' => 'a75b70e1bf6b01077a8e4a5994376bf6d5c407556396dccd8d',
                        'timestamp' => '1751479217',
                        'signature' => 'c61d6a863f0f1f82e69cea58693d579e2d417823726f3337a432731972e28b9a',
                    ],
                    'event-data' => [
                        'id' => 'Ase7i2zsRYeDXztHGENqRA',
                        'timestamp' => 1521243339.873676,
                        'log-level' => 'info',
                        'event' => 'unsubscribed',
                        'recipient' => 'alice@example.com',
                        'message' => [
                            'headers' => [
                                'message-id' => '20130503182626.18666.16540@ampldigital.com',
                            ],
                        ],
                        'ip' => '50.56.129.169',
                        'geolocation' => [
                            'country' => 'US',
                            'region' => 'CA',
                            'city' => 'San Francisco',
                        ],
                    ],
                ],
            ],
            [
                'title' => 'Spam Complaint (should create DNC)',
                'should_process' => true,
                'expected' => 'Creates DNC with reason code 2 (BOUNCED)',
                'webhook' => [
                    'signature' => [
                        'token' => 'cc09ebd5e7b8ab6975b1e09014523b60022dc92067598be10a',
                        'timestamp' => '1751479239',
                        'signature' => '56ef2473e365fe80fc8c97584ae75bb4d7038d4c18aff73702fb9444b39cf745',
                    ],
                    'event-data' => [
                        'id' => '-Agny091SquKnsrW2NEKUA',
                        'timestamp' => 1521233123.501324,
                        'log-level' => 'warn',
                        'event' => 'complained',
                        'recipient' => 'alice@example.com',
                        'message' => [
                            'headers' => [
                                'to' => 'Alice <alice@example.com>',
                                'message-id' => '20110215055645.25246.63817@ampldigital.com',
                                'from' => 'Bob <bob@ampldigital.com>',
                                'subject' => 'Test complained webhook',
                            ],
                            'size' => 111,
                        ],
                    ],
                ],
            ],
        ];
    }
}

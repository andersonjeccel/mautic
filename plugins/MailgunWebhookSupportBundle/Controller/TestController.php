<?php

declare(strict_types=1);

namespace MauticPlugin\MailgunWebhookSupportBundle\Controller;

use Mautic\CoreBundle\Controller\CommonController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class TestController extends CommonController
{
    public function testWebhookAction(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);

        if (!is_array($data)) {
            return new JsonResponse(['error' => 'Invalid JSON data'], 400);
        }

        // Forward the test data to the actual webhook endpoint
        $webhookRequest = Request::create(
            '/mailer/callback',
            'POST',
            [],
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode($data)
        );

        // Set Mailgun-like headers
        $webhookRequest->headers->set('User-Agent', 'Mailgun Webhook');
        $webhookRequest->headers->set('Content-Type', 'application/json');

        // Dispatch the webhook event
        $event = new \Mautic\EmailBundle\Event\TransportWebhookEvent($webhookRequest);
        $this->dispatcher->dispatch($event, \Mautic\EmailBundle\EmailEvents::ON_TRANSPORT_WEBHOOK);

        return new JsonResponse([
            'status'  => 'success',
            'message' => 'Test webhook processed',
            'data'    => $data,
        ]);
    }

    public function sampleDataAction(): Response
    {
        $sampleData = [
            // Bounce event
            [
                'event'      => 'bounced',
                'recipient'  => 'test@example.com',
                'reason'     => 'Mailbox not found',
                'error'      => '550 5.1.1 The email account that you tried to reach does not exist.',
                'timestamp'  => time(),
                'message-id' => 'test-message-id-123',
            ],
            // Unsubscribe event
            [
                'event'      => 'unsubscribed',
                'recipient'  => 'user@example.com',
                'timestamp'  => time(),
                'message-id' => 'test-message-id-456',
            ],
            // Spam complaint
            [
                'event'      => 'complained',
                'recipient'  => 'spam@example.com',
                'timestamp'  => time(),
                'message-id' => 'test-message-id-789',
            ],
            // Dropped event
            [
                'event'      => 'dropped',
                'recipient'  => 'dropped@example.com',
                'reason'     => 'Suppressed',
                'timestamp'  => time(),
                'message-id' => 'test-message-id-101',
            ],
        ];

        return new JsonResponse([
            'message' => 'Sample Mailgun webhook data',
            'data'    => $sampleData,
            'usage'   => [
                'description'  => 'Use this data to test the webhook endpoint',
                'endpoint'     => '/mailgun/test/webhook',
                'method'       => 'POST',
                'content_type' => 'application/json',
            ],
        ]);
    }
}

<?php

declare(strict_types=1);

namespace MauticPlugin\MailgunWebhookSupportBundle\Controller;

use Mautic\CoreBundle\Controller\CommonController;
use MauticPlugin\MailgunWebhookSupportBundle\Callback\ResponseItems;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

final class TestController extends CommonController
{
    #[Route('/mailgun/test', name: 'mautic_mailgun_test', methods: ['GET'])]
    public function testAction(): Response
    {
        return new Response('Mailgun Webhook Test Controller');
    }

    #[Route('/mailgun/test-webhook', name: 'mautic_mailgun_test_webhook', methods: ['POST'])]
    public function testWebhookAction(Request $request): Response
    {
        try {
            $responseItems = new ResponseItems($request);
            $items = [];

            foreach ($responseItems as $item) {
                $items[] = [
                    'email' => $item->getEmail(),
                    'reason' => $item->getReason(),
                    'dnc_reason' => $item->getDncReason(),
                    'channel' => $item->getChannel(),
                ];
            }

            return new JsonResponse([
                'success' => true,
                'items' => $items,
                'raw_data' => $request->request->all(),
                'content_type' => $request->headers->get('Content-Type'),
            ]);
        } catch (\Exception $e) {
            return new JsonResponse([
                'success' => false,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'raw_data' => $request->request->all(),
                'content_type' => $request->headers->get('Content-Type'),
            ], 500);
        }
    }
}

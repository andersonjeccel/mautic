<?php

declare(strict_types=1);

namespace MauticPlugin\MailgunWebhookSupportBundle\EventSubscriber;

use Mautic\CoreBundle\Helper\CoreParametersHelper;
use Mautic\CoreBundle\Helper\Dsn\Dsn;
use Mautic\EmailBundle\EmailEvents;
use Mautic\EmailBundle\Event as Events;
use Mautic\EmailBundle\Mailer\Message\MauticMessage;
use Mautic\EmailBundle\Model\TransportCallback;
use MauticPlugin\MailgunWebhookSupportBundle\Callback\ResponseItems;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mailer\Event\MessageEvent;
use Symfony\Component\Mailer\Header\MetadataHeader;

class WebhookSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private TransportCallback $transportCallback,
        private CoreParametersHelper $coreParametersHelper,
        private LoggerInterface $logger,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            EmailEvents::ON_TRANSPORT_WEBHOOK => ['onTransportWebhook', 0],
            MessageEvent::class               => ['onMessage', 0],
        ];
    }

    /**
     * Add metadata.
     */
    public function onMessage(MessageEvent $event): void
    {
        $dsn = Dsn::fromString($this->coreParametersHelper->get('mailer_dsn'));

        $message = $event->getMessage();
        if ($message instanceof MauticMessage) {
            $metadata = $message->getMetadata();
            $list     = [];
            foreach ($message->getTo() as $address) {
                if (isset($metadata[$address->getAddress()]['emailId'])) {
                    $list[$address->getAddress()]['emailId'] = $metadata[$address->getAddress()]['emailId'];
                }
            }

            if (!empty($list)) {
                if ('mailgun+api' === $dsn->getScheme()) {
                    $message->getHeaders()->add(new MetadataHeader('mautic_metadata', serialize($list)));
                }

                $payload = json_encode(['mautic_metadata' => $list]);
                if (false !== $payload) {
                    $message->getHeaders()->addTextHeader('X-Mailgun-Variables', $payload);
                }
            }
        }
    }

    /**
     * Add an entry.
     */
    public function onTransportWebhook(Events\TransportWebhookEvent $event): void
    {
        $request = $event->getRequest();

        // Log all webhook requests for debugging
        $this->logger->info('Mailgun Webhook: Received request', [
            'path'         => $request->getPathInfo(),
            'method'       => $request->getMethod(),
            'content_type' => $request->headers->get('Content-Type'),
            'user_agent'   => $request->headers->get('User-Agent'),
            'mailer_dsn'   => $this->coreParametersHelper->get('mailer_dsn'),
            'note'         => 'Processing webhooks regardless of mailer configuration',
        ]);

        if (!$this->isMailgunWebhook($request)) {
            $this->logger->debug('Mailgun Webhook: Request rejected (not a Mailgun webhook)');

            return;
        }

        $this->logger->info('Mailgun Webhook: Processing webhook request');

        try {
            $responseItems  = new ResponseItems($request);
            $processedCount = 0;

            // Log the raw request data for debugging
            $this->logger->info('Mailgun Webhook: Raw request data', [
                'request_all'  => $request->request->all(),
                'content'      => $request->getContent(),
                'content_type' => $request->headers->get('Content-Type'),
            ]);

            foreach ($responseItems as $item) {
                $this->logger->info('Mailgun Webhook: Processing item', [
                    'email'      => $item->getEmail(),
                    'reason'     => $item->getReason(),
                    'dnc_reason' => $item->getDncReason(),
                ]);

                $this->transportCallback->addFailureByAddress(
                    $item->getEmail(),
                    $item->getReason(),
                    $item->getDncReason(),
                    $item->getChannel()
                );
                ++$processedCount;
            }

            $this->logger->info('Mailgun Webhook: Processed items', ['count' => $processedCount]);
            $event->setResponse(new Response('OK'));
        } catch (\Exception $e) {
            $this->logger->error('Mailgun Webhook: Error processing webhook', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            $event->setResponse(new Response('Error: '.$e->getMessage(), 500));
        }
    }

    private function isMailgunWebhook(Request $request): bool
    {
        // Check if this is coming to the webhook endpoint
        $path = $request->getPathInfo();
        if ('/mailer/callback' !== $path) {
            return false;
        }

        // Check content type and method
        $contentType = $request->headers->get('Content-Type', '');
        $method      = $request->getMethod();

        if ('POST' !== $method) {
            return false;
        }

        // Mailgun sends webhooks as form-encoded, multipart, or JSON
        return str_contains($contentType, 'application/x-www-form-urlencoded')
               || str_contains($contentType, 'multipart/form-data')
               || str_contains($contentType, 'application/json');
    }
}

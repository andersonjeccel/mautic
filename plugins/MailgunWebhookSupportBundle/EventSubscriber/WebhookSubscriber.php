<?php

declare(strict_types=1);

namespace MauticPlugin\MailgunWebhookSupportBundle\EventSubscriber;

use Mautic\CoreBundle\Helper\CoreParametersHelper;
use Mautic\CoreBundle\Helper\Dsn\Dsn;
use Mautic\EmailBundle\EmailEvents;
use Mautic\EmailBundle\Event as Events;
use Mautic\EmailBundle\Mailer\Message\MauticMessage;
use Mautic\EmailBundle\Model\TransportCallback;
use MauticPlugin\MailgunWebhookSupportBundle\Callback\ResponseItem;
use MauticPlugin\MailgunWebhookSupportBundle\Callback\ResponseItems;
use MauticPlugin\MailgunWebhookSupportBundle\Service\WebhookLogger;
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
        private WebhookLogger $webhookLogger,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            EmailEvents::ON_TRANSPORT_WEBHOOK => ['onTransportWebhook', 0],
            MessageEvent::class               => ['onMessage', 0],
        ];
    }

    public function onMessage(MessageEvent $event): void
    {
        $dsn = Dsn::fromString($this->coreParametersHelper->get('mailer_dsn'));

        $message = $event->getMessage();
        if ($message instanceof MauticMessage) {
            $metadata      = $message->getMetadata();
            $list          = [];
            $recipientVars = [];
            foreach ($message->getTo() as $address) {
                if (isset($metadata[$address->getAddress()]['emailId'])) {
                    $emailId                                 = $metadata[$address->getAddress()]['emailId'];
                    $list[$address->getAddress()]['emailId'] = $emailId;
                    $recipientVars[$address->getAddress()]   = ['emailId' => $emailId];
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

                if (!empty($recipientVars)) {
                    $rv = json_encode($recipientVars);
                    if (false !== $rv) {
                        $message->getHeaders()->addTextHeader('X-Mailgun-Recipient-Variables', $rv);
                    }
                }
            }
        }
    }

    public function onTransportWebhook(Events\TransportWebhookEvent $event): void
    {
        $request = $event->getRequest();
        $responseItems = [];
        $exception = null;

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
            $this->webhookLogger->logWebhook($request, $responseItems, $exception);
            return;
        }

        $this->logger->info('Mailgun Webhook: Processing webhook request');

        try {
            $responseItems  = new ResponseItems($request);
            $processedCount = 0;
            $itemsArray = [];

            $this->logger->info('Mailgun Webhook: Raw request data', [
                'request_all'  => $request->request->all(),
                'content'      => $request->getContent(),
                'content_type' => $request->headers->get('Content-Type'),
            ]);

            $temporaryBounceItem = $this->checkForTemporaryBounce($request);
            if ($temporaryBounceItem) {
                $itemsArray[] = $temporaryBounceItem;
            }

            foreach ($responseItems as $item) {
                $itemsArray[] = $item;
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
            $this->webhookLogger->logWebhook($request, $itemsArray, $exception);
            $event->setResponse(new Response('OK'));
        } catch (\Exception $e) {
            $exception = $e;
            $this->logger->error('Mailgun Webhook: Error processing webhook', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            $this->webhookLogger->logWebhook($request, $responseItems, $exception);
            $event->setResponse(new Response('Error: '.$e->getMessage(), 500));
        }
    }

    private function isMailgunWebhook(Request $request): bool
    {
        $path = $request->getPathInfo();
        if ('/mailer/callback' !== $path) {
            return false;
        }

        $contentType = $request->headers->get('Content-Type', '');
        $method      = $request->getMethod();

        if ('POST' !== $method) {
            return false;
        }

        return str_contains($contentType, 'application/x-www-form-urlencoded')
               || str_contains($contentType, 'multipart/form-data')
               || str_contains($contentType, 'application/json');
    }

    private function checkForTemporaryBounce(Request $request): ?ResponseItem
    {
        $content = $request->getContent();
        if (empty($content)) {
            return null;
        }

        $data = json_decode($content, true);
        if (!is_array($data) || !isset($data['event-data'])) {
            return null;
        }

        $eventData = $data['event-data'];
        if (($eventData['event'] ?? '') === 'failed' && ($eventData['severity'] ?? '') === 'temporary') {
            return new ResponseItem($eventData);
        }

        return null;
    }
}

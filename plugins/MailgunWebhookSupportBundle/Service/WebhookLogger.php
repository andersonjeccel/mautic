<?php

declare(strict_types=1);

namespace MauticPlugin\MailgunWebhookSupportBundle\Service;

use MauticPlugin\MailgunWebhookSupportBundle\Callback\ResponseItem;
use Symfony\Component\HttpFoundation\Request;

final class WebhookLogger
{
    private string $logFile;

    public function __construct(string $kernelProjectDir)
    {
        $this->logFile = $kernelProjectDir.'/var/logs/mailgun_webhooks.log';
    }

    /**
     * @param array<ResponseItem> $responseItems
     */
    public function logWebhook(Request $request, array $responseItems = [], ?\Exception $exception = null): void
    {
        $lines = [];
        if ($exception) {
            $lines[] = sprintf('[%s] ERROR: %s', date('c'), $exception->getMessage());
        } elseif (empty($responseItems)) {
            $lines[] = sprintf('[%s] REJECTED: Not a Mailgun webhook', date('c'));
        } else {
            foreach ($responseItems as $item) {
                $emailId  = $item->getChannel() ? "email [{$item->getChannel()}]" : 'email [unknown]';
                $dncResult = $this->getDncResult($item);

                $lines[] = sprintf(
                    '[%s] %s [%s] from %s, resulting in [%s]',
                    date('c'),
                    $item->getEmail(),
                    $item->getReason(),
                    $emailId,
                    $dncResult
                );
            }
        }

        if (!empty($lines)) {
            file_put_contents($this->logFile, implode("\n", $lines)."\n", FILE_APPEND | LOCK_EX);
        }
    }

    private function getDncResult(ResponseItem $item): string
    {
        $dncReason = $item->getDncReason();

        if ($dncReason === null) {
            return 'DNC::IS_CONTACTABLE (ignored)';
        }

        return match ($dncReason) {
            1 => 'DNC::UNSUBSCRIBED',
            2 => 'DNC::BOUNCED',
            3 => 'DNC::MANUAL',
            default => "DNC::UNKNOWN({$dncReason})"
        };
    }
}

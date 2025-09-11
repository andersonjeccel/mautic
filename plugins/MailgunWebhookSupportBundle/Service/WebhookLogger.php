<?php

declare(strict_types=1);

namespace MauticPlugin\MailgunWebhookSupportBundle\Service;

use Symfony\Component\HttpFoundation\Request;

class WebhookLogger
{
    private string $logFile;

    public function __construct(string $kernelProjectDir)
    {
        $this->logFile = $kernelProjectDir.'/var/logs/mailgun_webhooks.log';
    }

    public function logWebhook(Request $request, array $responseItems = [], ?\Exception $exception = null): void
    {
        if ($exception) {
            $logLine = sprintf('[%s] ERROR: %s', date('c'), $exception->getMessage());
        } elseif (empty($responseItems)) {
            $logLine = sprintf('[%s] REJECTED: Not a Mailgun webhook', date('c'));
        } else {
            foreach ($responseItems as $item) {
                $emailId = $item->getChannel() ? "email [{$item->getChannel()}]" : 'email [unknown]';
                $dncResult = $this->getDncResult($item);
                
                $logLine = sprintf(
                    '[%s] %s [%s] from %s, resulting in [%s]',
                    date('c'),
                    $item->getEmail(),
                    $item->getReason(),
                    $emailId,
                    $dncResult
                );
            }
        }

        file_put_contents($this->logFile, $logLine."\n", FILE_APPEND | LOCK_EX);
    }

    private function getDncResult($item): string
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

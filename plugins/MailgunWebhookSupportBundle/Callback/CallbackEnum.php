<?php

declare(strict_types=1);

namespace MauticPlugin\MailgunWebhookSupportBundle\Callback;

use Mautic\LeadBundle\Entity\DoNotContact;

final class CallbackEnum
{
    public const COMPLAINED = 'complained';
    public const UNSUBSCRIBE = 'unsubscribed';
    public const FAILED = 'failed';

    /**
     * @param array<string, mixed> $eventData
     */
    public static function shouldBeEventProcessed(string $event, array $eventData = []): bool
    {
        if (! in_array($event, self::getSupportedEvents(), true)) {
            return false;
        }

        if (self::FAILED === $event) {
            $severity = $eventData['severity'] ?? '';

            return 'permanent' === $severity;
        }

        return true;
    }

    /**
     * @param array<string, mixed> $eventData
     */
    public static function convertEventToDncReason(string $event, array $eventData = []): ?int
    {
        if (! self::shouldBeEventProcessed($event, $eventData)) {
            return null;
        }

        $mapping = self::eventMappingToDncReason();

        return $mapping[$event];
    }

    /**
     * @return array<string>
     */
    private static function getSupportedEvents(): array
    {
        return [
            self::COMPLAINED,
            self::UNSUBSCRIBE,
            self::FAILED,
        ];
    }

    /**
     * @return array<string, int>
     */
    private static function eventMappingToDncReason(): array
    {
        return [
            self::COMPLAINED => DoNotContact::BOUNCED,
            self::UNSUBSCRIBE => DoNotContact::UNSUBSCRIBED,
            self::FAILED => DoNotContact::BOUNCED,
        ];
    }
}

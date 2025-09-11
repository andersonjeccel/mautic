<?php

declare(strict_types=1);

namespace MauticPlugin\MailgunWebhookSupportBundle\Callback;

final class ResponseItem
{
    private string $email;
    private string $reason;
    private ?int $dncReason;
    private ?int $channel;

    /**
     * @param array<string, mixed> $data
     */
    public function __construct(array $data)
    {
        $this->email = $data['recipient'] ?? '';
        $this->reason = $this->determineReason($data);
        $this->dncReason = CallbackEnum::convertEventToDncReason($data['event'] ?? '', $data);
        $this->channel = $this->extractChannelId($data);
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function getReason(): string
    {
        return $this->reason;
    }

    public function getDncReason(): ?int
    {
        return $this->dncReason;
    }

    public function getChannel(): ?int
    {
        return $this->channel;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function determineReason(array $data): string
    {
        $event = $data['event'] ?? '';
        $reason = $data['reason'] ?? '';
        $error = $data['error'] ?? '';
        $severity = $data['severity'] ?? '';
        $deliveryStatus = $data['delivery-status'] ?? [];

        if (CallbackEnum::FAILED === $event && is_array($deliveryStatus)) {
            if (! empty($deliveryStatus['message'])) {
                return trim($deliveryStatus['message']);
            }

            if (! empty($deliveryStatus['description'])) {
                return trim($deliveryStatus['description']);
            }

            if (! empty($deliveryStatus['enhanced-code']) && ! empty($deliveryStatus['description'])) {
                return trim($deliveryStatus['enhanced-code'].' '.$deliveryStatus['description']);
            }
        }

        if ($reason) {
            return $reason;
        }

        if ($error) {
            return $error;
        }

        return match ($event) {
            CallbackEnum::COMPLAINED => 'Spam complaint',
            CallbackEnum::UNSUBSCRIBE => 'Unsubscribed',
            CallbackEnum::FAILED => 'permanent' === $severity ? 'Permanent failure' : 'Failed to deliver',
            default => 'Unknown',
        };
    }

    /**
     * @param array<string, mixed> $data
     */
    private function extractChannelId(array $data): ?int
    {
        $recipient = $this->email;

        if (isset($data['user-variables']) && is_array($data['user-variables'])) {
            $vars = $data['user-variables'];

            if (isset($vars['emailId']) && is_numeric($vars['emailId'])) {
                return (int) $vars['emailId'];
            }

            if (isset($vars['mautic_metadata'])) {
                $emailId = $this->parseMetadataForEmailId($vars['mautic_metadata'], $recipient);
                if (null !== $emailId) {
                    return $emailId;
                }
            }
        }

        if (isset($data['message']['headers']['X-Mailgun-Variables'])) {
            $json = $data['message']['headers']['X-Mailgun-Variables'];
            if (is_string($json)) {
                $decoded = json_decode($json, true);
                if (is_array($decoded) && isset($decoded['mautic_metadata'])) {
                    $emailId = $this->parseMetadataForEmailId($decoded['mautic_metadata'], $recipient);
                    if (null !== $emailId) {
                        return $emailId;
                    }
                }
            }
        }

        return null;
    }

    private function parseMetadataForEmailId(mixed $rawMetadata, string $recipient): ?int
    {
        if (! is_array($rawMetadata)) {
            return null;
        }

        if (isset($rawMetadata[$recipient]['emailId']) && is_numeric($rawMetadata[$recipient]['emailId'])) {
            return (int) $rawMetadata[$recipient]['emailId'];
        }

        if (isset($rawMetadata['emailId']) && is_numeric($rawMetadata['emailId'])) {
            return (int) $rawMetadata['emailId'];
        }

        return null;
    }
}

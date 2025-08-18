<?php

namespace MauticPlugin\MailgunWebhookSupportBundle\Callback;

class ResponseItem
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
        $this->email     = $data['recipient'] ?? '';
        $this->reason    = $this->determineReason($data);
        $this->dncReason = CallbackEnum::convertEventToDncReason($data['event'] ?? '', $data);
        $this->channel   = null; // Will be passed as null to use default 'email' channel
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
        $event          = $data['event'] ?? '';
        $reason         = $data['reason'] ?? '';
        $error          = $data['error'] ?? '';
        $severity       = $data['severity'] ?? '';
        $deliveryStatus = $data['delivery-status'] ?? [];

        // For failed events, prioritize detailed SMTP error messages
        if (CallbackEnum::FAILED === $event && is_array($deliveryStatus)) {
            // Try to get the detailed SMTP message first
            if (!empty($deliveryStatus['message'])) {
                return trim($deliveryStatus['message']);
            }

            // Fall back to description if message is not available
            if (!empty($deliveryStatus['description'])) {
                return trim($deliveryStatus['description']);
            }

            // If we have enhanced code and description, combine them
            if (!empty($deliveryStatus['enhanced-code']) && !empty($deliveryStatus['description'])) {
                return trim($deliveryStatus['enhanced-code'].' '.$deliveryStatus['description']);
            }
        }

        // For other events, use the standard reason/error hierarchy
        if ($reason) {
            return $reason;
        }

        if ($error) {
            return $error;
        }

        return match ($event) {
            CallbackEnum::COMPLAINED  => 'Spam complaint',
            CallbackEnum::UNSUBSCRIBE => 'Unsubscribed',
            CallbackEnum::FAILED      => 'permanent' === $severity ? 'Permanent failure' : 'Failed to deliver',
            default                   => 'Unknown',
        };
    }
}

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
        $this->channel   = $this->extractChannelId($data);
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

    /**
     * Extract the Mautic email ID from real Mailgun webhook data
     * 
     * Supports email identification in this order:
     * - user-variables.emailId (direct)
     * - user-variables.mautic_metadata (JSON object from real Mailgun format)
     * - message.headers.X-Mailgun-Variables (JSON containing mautic_metadata)
     *
     * @param array<string, mixed> $data
     */
    private function extractChannelId(array $data): ?int
    {
        $recipient = $this->email;

        // 1) user-variables (Mailgun's standard way to pass custom data)
        if (isset($data['user-variables']) && is_array($data['user-variables'])) {
            $vars = $data['user-variables'];

            // Direct emailId
            if (isset($vars['emailId']) && is_numeric($vars['emailId'])) {
                return (int) $vars['emailId'];
            }

            // mautic_metadata (JSON object from real Mailgun format)
            if (isset($vars['mautic_metadata'])) {
                $emailId = $this->parseMetadataForEmailId($vars['mautic_metadata'], $recipient);
                if (null !== $emailId) {
                    return $emailId;
                }
            }
        }

        // 2) message.headers.X-Mailgun-Variables (JSON format)
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

    /**
     * Parse metadata to extract email ID for the recipient
     * Handles JSON objects from real Mailgun webhook format
     * 
     * @param mixed $rawMetadata
     */
    private function parseMetadataForEmailId($rawMetadata, string $recipient): ?int
    {
        // Handle JSON object (real Mailgun format)
        if (!is_array($rawMetadata)) {
            return null;
        }

        // Look for emailId keyed by recipient address (preferred format)
        if (isset($rawMetadata[$recipient]['emailId']) && is_numeric($rawMetadata[$recipient]['emailId'])) {
            return (int) $rawMetadata[$recipient]['emailId'];
        }

        // Fallback: top-level emailId
        if (isset($rawMetadata['emailId']) && is_numeric($rawMetadata['emailId'])) {
            return (int) $rawMetadata['emailId'];
        }

        return null;
    }
}

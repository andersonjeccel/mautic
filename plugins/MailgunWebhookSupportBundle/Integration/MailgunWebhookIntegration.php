<?php

declare(strict_types=1);

namespace MauticPlugin\MailgunWebhookSupportBundle\Integration;

use Mautic\PluginBundle\Integration\AbstractIntegration;

final class MailgunWebhookIntegration extends AbstractIntegration
{
    public function getName(): string
    {
        return 'MailgunWebhook';
    }

    public function getDisplayName(): string
    {
        return 'Mailgun Webhook Support';
    }

    public function getDescription(): string
    {
        return 'Add Mailgun Webhook support to Mautic for handling bounces, complaints, and unsubscribes';
    }

    public function getAuthenticationType(): string
    {
        return 'none';
    }

    /**
     * @return array<string, string>
     */
    public function getRequiredKeyFields(): array
    {
        return [
            'webhook_signing_key' => 'mautic.plugin.mailgun.webhook_signing_key',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getFormSettings(): array
    {
        return parent::getFormSettings();
    }

    /**
     * @return array<string>
     */
    public function getSupportedFeatures(): array
    {
        return [];
    }

    public function isConfigured(): bool
    {
        $requiredTokens = $this->getRequiredKeyFields();
        foreach ($requiredTokens as $token => $label) {
            if (empty($this->keys[$token])) {
                return false;
            }
        }

        return true;
    }
}

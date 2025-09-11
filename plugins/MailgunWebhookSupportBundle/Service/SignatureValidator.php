<?php

declare(strict_types=1);

namespace MauticPlugin\MailgunWebhookSupportBundle\Service;

use Mautic\PluginBundle\Helper\IntegrationHelper;
use Symfony\Component\HttpFoundation\Request;

final class SignatureValidator
{
    public function __construct(private IntegrationHelper $integrationHelper)
    {
    }

    /**
     * Validates Mailgun webhook signature.
     * - Extracts signature from JSON body: signature.timestamp, signature.token, signature.signature
     * - Computes HMAC SHA256 of timestamp + token using the configured signing key
     * - Verifies timestamp freshness to prevent replay (default 15 minutes window)
     */
    public function isValid(Request $request, int $toleranceSeconds = 900): bool
    {
        $content = $request->getContent();
        if ('' === $content) {
            return false;
        }

        $data = json_decode($content, true);
        if (!is_array($data) || !isset($data['signature']) || !is_array($data['signature'])) {
            return false;
        }

        $sig = $data['signature'];
        $timestamp = isset($sig['timestamp']) ? (string) $sig['timestamp'] : '';
        $token     = isset($sig['token']) ? (string) $sig['token'] : '';
        $signature = isset($sig['signature']) ? (string) $sig['signature'] : '';

        if ('' === $timestamp || '' === $token || '' === $signature) {
            return false;
        }

        if (!ctype_digit($timestamp)) {
            return false;
        }
        $ts = (int) $timestamp;
        if ($toleranceSeconds > 0 && (abs(time() - $ts) > $toleranceSeconds)) {
            return false;
        }

        $signingKey = $this->getSigningKey();
        if (null === $signingKey || '' === trim($signingKey)) {
            return false;
        }

        $computed = hash_hmac('sha256', $timestamp.$token, $signingKey);

        return function_exists('hash_equals') ? hash_equals($computed, $signature) : $computed === $signature;
    }

    private function getSigningKey(): ?string
    {
        try {
            $integration = $this->integrationHelper->getIntegrationObject('MailgunWebhook');
            if ($integration) {
                $keys = $integration->getDecryptedApiKeys();
                $val  = $keys['webhook_signing_key'] ?? null;
                if (is_string($val) && '' !== $val) {
                    return $val;
                }
            }
        } catch (\Throwable) {
        }

        return null;
    }
}

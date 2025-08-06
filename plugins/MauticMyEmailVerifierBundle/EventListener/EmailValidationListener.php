<?php

declare(strict_types=1);

namespace MauticPlugin\MauticMyEmailVerifierBundle\EventListener;

use Mautic\EmailBundle\EmailEvents;
use Mautic\EmailBundle\Event\EmailValidationEvent;
use Mautic\PluginBundle\Helper\IntegrationHelper;
use MauticPlugin\MauticMyEmailVerifierBundle\Integration\MyEmailVerifierIntegration;
use MauticPlugin\MauticMyEmailVerifierBundle\Services\MyEmailVerifierService;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

final class EmailValidationListener implements EventSubscriberInterface
{
    public function __construct(
        private MyEmailVerifierService $emailVerifierService,
        private IntegrationHelper $integrationHelper,
        private LoggerInterface $logger,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            EmailEvents::ON_EMAIL_VALIDATION => ['onEmailValidation', 0],
        ];
    }

    public function onEmailValidation(EmailValidationEvent $event): void
    {
        if (!$this->isCampaignContext()) {
            $this->logger->debug('MyEmailVerifier: Skipping validation - not in campaign context');

            return;
        }

        try {
            $integration = $this->integrationHelper->getIntegrationObject('MyEmailVerifier');

            if (false === $integration || !$integration instanceof MyEmailVerifierIntegration) {
                $this->logger->debug('MyEmailVerifier: Integration not found or not properly configured');

                return;
            }

            if (!$integration->getIntegrationSettings()->getIsPublished()) {
                $this->logger->debug('MyEmailVerifier: Integration is not published');

                return;
            }

            $apiKey = $integration->getApiKey();
            if (empty($apiKey)) {
                $this->logger->warning('MyEmailVerifier: API key is not configured');

                return;
            }

            $email = $event->getAddress();
            $this->logger->info('MyEmailVerifier: Starting email validation', ['email' => $email]);

            $validationResult = $this->emailVerifierService->validateEmail($email, $apiKey);

            if (!$validationResult['success']) {
                $this->logger->error('MyEmailVerifier: Validation failed', [
                    'email' => $email,
                    'error' => $validationResult['error'],
                ]);

                return;
            }

            $validationData = $validationResult['data'];

            $rejectCatchAll   = $integration->shouldRejectCatchAll();
            $rejectGreylisted = $integration->shouldRejectGreylisted();
            $rejectUnknown    = $integration->shouldRejectUnknown();

            $rejectionResult = $this->emailVerifierService->shouldRejectEmail(
                $validationData,
                $rejectCatchAll,
                $rejectGreylisted,
                $rejectUnknown
            );

            if ($rejectionResult['reject']) {
                $this->logger->info('MyEmailVerifier: Email rejected', [
                    'email'  => $email,
                    'reason' => $rejectionResult['reason'],
                ]);

                $event->setInvalid('MyEmailVerifier: '.$rejectionResult['reason']);

                return;
            }

            $this->logger->info('MyEmailVerifier: Email validation passed', [
                'email' => $email,
                'data'  => $validationData,
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('MyEmailVerifier: Unexpected error during validation', [
                'email'     => $event->getAddress(),
                'exception' => $e->getMessage(),
                'trace'     => $e->getTraceAsString(),
            ]);
        }
    }

    private function isCampaignContext(): bool
    {
        $backtrace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 10);

        foreach ($backtrace as $trace) {
            if (isset($trace['class']) && 'Mautic\EmailBundle\EventListener\CampaignConditionSubscriber' === $trace['class']) {
                $this->logger->debug('MyEmailVerifier: Detected campaign context');

                return true;
            }
        }

        return false;
    }
}

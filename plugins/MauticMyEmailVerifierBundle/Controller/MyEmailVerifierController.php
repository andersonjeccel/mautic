<?php

declare(strict_types=1);

namespace MauticPlugin\MauticMyEmailVerifierBundle\Controller;

use Mautic\CoreBundle\Controller\CommonController;
use Mautic\PluginBundle\Helper\IntegrationHelper;
use MauticPlugin\MauticMyEmailVerifierBundle\Integration\MyEmailVerifierIntegration;
use MauticPlugin\MauticMyEmailVerifierBundle\Services\MyEmailVerifierService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

final class MyEmailVerifierController extends CommonController
{
    public function testApiAction(Request $request, MyEmailVerifierService $emailVerifierService, IntegrationHelper $integrationHelper): JsonResponse
    {
        if (!$this->user->isAdmin()) {
            return new JsonResponse(['success' => false, 'message' => 'Access denied'], 403);
        }

        try {
            $integration = $integrationHelper->getIntegrationObject('MyEmailVerifier');

            if (false === $integration || !$integration instanceof MyEmailVerifierIntegration) {
                return new JsonResponse([
                    'success' => false,
                    'message' => $this->translator->trans('mautic.plugin.myemailverifier.api_key_required'),
                ]);
            }

            $apiKey = $integration->getApiKey();
            if (empty($apiKey)) {
                return new JsonResponse([
                    'success' => false,
                    'message' => $this->translator->trans('mautic.plugin.myemailverifier.api_key_required'),
                ]);
            }

            $testResult = $emailVerifierService->testApiConnectivity($apiKey);

            if ($testResult['success']) {
                return new JsonResponse([
                    'success' => true,
                    'message' => $this->translator->trans('mautic.plugin.myemailverifier.test_success'),
                    'data'    => $testResult['data'],
                ]);
            }

            return new JsonResponse([
                'success' => false,
                'message' => $this->translator->trans('mautic.plugin.myemailverifier.test_error', [
                    '%error%' => $testResult['error'],
                ]),
            ]);
        } catch (\Throwable $e) {
            return new JsonResponse([
                'success' => false,
                'message' => $this->translator->trans('mautic.plugin.myemailverifier.test_error', [
                    '%error%' => $e->getMessage(),
                ]),
            ]);
        }
    }
}

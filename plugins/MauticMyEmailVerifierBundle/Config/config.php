<?php

declare(strict_types=1);

return [
    'name'        => 'MyEmailVerifier',
    'description' => 'Enables integration with MyEmailVerifier for email validation in campaign conditions',
    'version'     => '1.0',
    'author'      => 'Mautic Community',

    'routes' => [
        'main' => [
            'mautic_plugin_myemailverifier_test' => [
                'path'       => '/myemailverifier/test',
                'controller' => 'MauticPlugin\MauticMyEmailVerifierBundle\Controller\MyEmailVerifierController::testApiAction',
            ],
        ],
    ],

    'services' => [
        'others' => [
            'mautic.plugin.myemailverifier.service' => [
                'class'     => MauticPlugin\MauticMyEmailVerifierBundle\Services\MyEmailVerifierService::class,
                'arguments' => [
                    'monolog.logger.mautic',
                    'mautic.http.client',
                ],
            ],
        ],
        'integrations' => [
            'mautic.integration.myemailverifier' => [
                'class'     => MauticPlugin\MauticMyEmailVerifierBundle\Integration\MyEmailVerifierIntegration::class,
                'arguments' => [
                    'event_dispatcher',
                    'mautic.helper.cache_storage',
                    'doctrine.orm.entity_manager',
                    'request_stack',
                    'router',
                    'translator',
                    'monolog.logger.mautic',
                    'mautic.helper.encryption',
                    'mautic.lead.model.lead',
                    'mautic.lead.model.company',
                    'mautic.helper.paths',
                    'mautic.core.model.notification',
                    'mautic.lead.model.field',
                    'mautic.plugin.model.integration_entity',
                    'mautic.lead.model.dnc',
                    'mautic.lead.field.fields_with_unique_identifier',
                ],
            ],
        ],
        'event_listeners' => [
            'mautic.plugin.myemailverifier.email_validation.subscriber' => [
                'class'     => MauticPlugin\MauticMyEmailVerifierBundle\EventListener\EmailValidationListener::class,
                'arguments' => [
                    'mautic.plugin.myemailverifier.service',
                    'mautic.helper.integration',
                    'monolog.logger.mautic',
                ],
                'tag' => 'kernel.event_subscriber',
            ],
        ],
    ],
];

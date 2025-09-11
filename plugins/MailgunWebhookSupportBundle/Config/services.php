<?php

declare(strict_types=1);

use Mautic\CoreBundle\DependencyInjection\MauticCoreExtension;
use MauticPlugin\MailgunWebhookSupportBundle\Service\WebhookLogger;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;

return function (ContainerConfigurator $configurator): void {
    $services = $configurator->services()
        ->defaults()
        ->autowire()
        ->autoconfigure()
        ->public();

    $excludes = [
        'Callback',
        'test_internal.php',
        'test_webhook.php',
        'test_curl_examples.sh',
    ];

    $services->load('MauticPlugin\\MailgunWebhookSupportBundle\\', '../')
        ->exclude('../{'.implode(',', array_merge(MauticCoreExtension::DEFAULT_EXCLUDES, $excludes)).'}');

    $services->set(WebhookLogger::class)
        ->args(['%kernel.project_dir%']);
};

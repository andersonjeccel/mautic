<?php

declare(strict_types=1);

use Symfony\Component\Routing\Loader\Configurator\RoutingConfigurator;

return function (RoutingConfigurator $routes): void {
    $routes->add('mailgun_test_webhook', '/mailgun/test/webhook')
        ->controller('MauticPlugin\MailgunWebhookSupportBundle\Controller\TestController::testWebhookAction')
        ->methods(['POST']);

    $routes->add('mailgun_test_sample', '/mailgun/test/sample')
        ->controller('MauticPlugin\MailgunWebhookSupportBundle\Controller\TestController::sampleDataAction')
        ->methods(['GET']);
};

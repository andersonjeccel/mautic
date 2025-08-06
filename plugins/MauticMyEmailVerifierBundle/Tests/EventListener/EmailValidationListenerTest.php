<?php

declare(strict_types=1);

namespace MauticPlugin\MauticMyEmailVerifierBundle\Tests\EventListener;

use GuzzleHttp\Client;
use Mautic\EmailBundle\EmailEvents;
use Mautic\EmailBundle\Event\EmailValidationEvent;
use Mautic\PluginBundle\Helper\IntegrationHelper;
use MauticPlugin\MauticMyEmailVerifierBundle\EventListener\EmailValidationListener;
use MauticPlugin\MauticMyEmailVerifierBundle\Services\MyEmailVerifierService;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

final class EmailValidationListenerTest extends TestCase
{
    public function testGetSubscribedEvents(): void
    {
        $logger               = $this->createMock(LoggerInterface::class);
        $httpClient           = $this->createMock(Client::class);
        $emailVerifierService = new MyEmailVerifierService($logger, $httpClient);
        $integrationHelper    = $this->createMock(IntegrationHelper::class);

        $listener = new EmailValidationListener(
            $emailVerifierService,
            $integrationHelper,
            $logger
        );

        $events = $listener::getSubscribedEvents();

        $this->assertArrayHasKey(EmailEvents::ON_EMAIL_VALIDATION, $events);
        $this->assertEquals(['onEmailValidation', 0], $events[EmailEvents::ON_EMAIL_VALIDATION]);
    }

    public function testOnEmailValidationSkipsWhenNotInCampaignContext(): void
    {
        $logger               = $this->createMock(LoggerInterface::class);
        $httpClient           = $this->createMock(Client::class);
        $emailVerifierService = new MyEmailVerifierService($logger, $httpClient);
        $integrationHelper    = $this->createMock(IntegrationHelper::class);

        $listener = new EmailValidationListener(
            $emailVerifierService,
            $integrationHelper,
            $logger
        );

        $event = new EmailValidationEvent('test@example.com');

        $logger->expects($this->once())
            ->method('debug')
            ->with('MyEmailVerifier: Skipping validation - not in campaign context');

        $integrationHelper->expects($this->never())
            ->method('getIntegrationObject');

        $listener->onEmailValidation($event);

        $this->assertTrue($event->isValid());
    }

    public function testIsCampaignContextReturnsFalseWhenNotInCampaignContext(): void
    {
        $logger               = $this->createMock(LoggerInterface::class);
        $httpClient           = $this->createMock(Client::class);
        $emailVerifierService = new MyEmailVerifierService($logger, $httpClient);
        $integrationHelper    = $this->createMock(IntegrationHelper::class);

        $listener = new EmailValidationListener(
            $emailVerifierService,
            $integrationHelper,
            $logger
        );

        $reflection = new \ReflectionClass($listener);
        $method     = $reflection->getMethod('isCampaignContext');
        $method->setAccessible(true);

        $result = $method->invoke($listener);

        $this->assertFalse($result);
    }
}

<?php

declare(strict_types=1);

namespace MauticPlugin\MailgunWebhookSupportBundle;

use Mautic\PluginBundle\Bundle\PluginBundleBase;
use Symfony\Component\DependencyInjection\ContainerBuilder;

class MailgunWebhookSupportBundle extends PluginBundleBase
{
    public function build(ContainerBuilder $container): void
    {
        parent::build($container);
    }
}

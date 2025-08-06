<?php

declare(strict_types=1);

namespace MauticPlugin\MauticMyEmailVerifierBundle\Integration;

use Mautic\CoreBundle\Form\Type\YesNoButtonGroupType;
use Mautic\PluginBundle\Integration\AbstractIntegration;
use Symfony\Component\Form\Extension\Core\Type\ButtonType;
use Symfony\Component\Form\Form;
use Symfony\Component\Form\FormBuilder;

final class MyEmailVerifierIntegration extends AbstractIntegration
{
    public function getName(): string
    {
        return 'MyEmailVerifier';
    }

    public function getDisplayName(): string
    {
        return 'MyEmailVerifier';
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
            'apikey' => 'mautic.integration.myemailverifier.apikey',
        ];
    }

    /**
     * @return array<string>
     */
    public function getSecretKeys(): array
    {
        return ['apikey'];
    }

    /**
     * @param FormBuilder|Form     $builder
     * @param array<string, mixed> $data
     * @param string               $formArea
     */
    public function appendToForm(&$builder, $data, $formArea): void
    {
        if ('keys' === $formArea) {
            $builder->add(
                'reject_catch_all',
                YesNoButtonGroupType::class,
                [
                    'label' => 'mautic.plugin.myemailverifier.reject_catch_all',
                    'data'  => isset($data['reject_catch_all']) && (bool) $data['reject_catch_all'],
                    'attr'  => [
                        'tooltip' => 'mautic.plugin.myemailverifier.reject_catch_all.tooltip',
                    ],
                ]
            );

            $builder->add(
                'reject_greylisted',
                YesNoButtonGroupType::class,
                [
                    'label' => 'mautic.plugin.myemailverifier.reject_greylisted',
                    'data'  => isset($data['reject_greylisted']) && (bool) $data['reject_greylisted'],
                    'attr'  => [
                        'tooltip' => 'mautic.plugin.myemailverifier.reject_greylisted.tooltip',
                    ],
                ]
            );

            $builder->add(
                'reject_unknown',
                YesNoButtonGroupType::class,
                [
                    'label' => 'mautic.plugin.myemailverifier.reject_unknown',
                    'data'  => isset($data['reject_unknown']) && (bool) $data['reject_unknown'],
                    'attr'  => [
                        'tooltip' => 'mautic.plugin.myemailverifier.reject_unknown.tooltip',
                    ],
                ]
            );

            $builder->add(
                'test_api',
                ButtonType::class,
                [
                    'label' => 'mautic.plugin.myemailverifier.test_api',
                    'attr'  => [
                        'class'   => 'btn btn-primary',
                        'onclick' => 'testMyEmailVerifierApi()',
                        'tooltip' => 'mautic.plugin.myemailverifier.test_api.tooltip',
                    ],
                ]
            );
        }
    }

    public function shouldRejectCatchAll(): bool
    {
        $settings = $this->getKeys();

        return isset($settings['reject_catch_all']) && (bool) $settings['reject_catch_all'];
    }

    public function shouldRejectGreylisted(): bool
    {
        $settings = $this->getKeys();

        return isset($settings['reject_greylisted']) && (bool) $settings['reject_greylisted'];
    }

    public function shouldRejectUnknown(): bool
    {
        $settings = $this->getKeys();

        return isset($settings['reject_unknown']) && (bool) $settings['reject_unknown'];
    }

    public function getApiKey(): ?string
    {
        $keys = $this->getKeys();

        return $keys['apikey'] ?? null;
    }

    /**
     * @return string|array
     */
    public function getFormNotes($section)
    {
        if ('custom' === $section) {
            return [
                'template'   => '@MauticMyEmailVerifier/Integration/form.html.twig',
                'parameters' => [],
            ];
        }

        return parent::getFormNotes($section);
    }
}

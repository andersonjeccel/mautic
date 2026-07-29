<?php

namespace Mautic\LeadBundle\Form\Type;

use Mautic\CoreBundle\Form\Type\FormButtonsType;
use Mautic\LeadBundle\Entity\DoNotContact;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\FormBuilderInterface;

/**
 * @extends AbstractType<mixed>
 */
final class DncType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder->add(
            'status',
            ChoiceType::class,
            [
                'choices' => [
                    'mautic.lead.batch.dnc_status.blocked'     => DoNotContact::MANUAL,
                    'mautic.lead.batch.dnc_status.contactable' => DoNotContact::IS_CONTACTABLE,
                ],
                'expanded'   => true,
                'label'      => 'mautic.lead.batch.dnc_status',
                'label_attr' => ['class' => 'control-label'],
                'help'       => 'mautic.lead.batch.dnc_status.help',
            ]
        );

        $builder->add(
            'reason',
            TextareaType::class,
            [
                'label'      => 'mautic.lead.batch.dnc_reason',
                'required'   => false,
                'label_attr' => ['class' => 'control-label'],
                'attr'       => ['class' => 'form-control'],
                'help'       => 'mautic.lead.batch.dnc_reason.help',
            ]
        );

        $builder->add(
            'ids',
            HiddenType::class
        );

        $builder->add(
            'buttons',
            FormButtonsType::class,
            [
                'apply_text'     => false,
                'save_text'      => 'mautic.core.form.save',
                'cancel_onclick' => 'javascript:void(0);',
                'cancel_attr'    => [
                    'data-dismiss' => 'modal',
                ],
            ]
        );

        if (!empty($options['action'])) {
            $builder->setAction($options['action']);
        }
    }

    public function getBlockPrefix(): string
    {
        return 'lead_batch_dnc';
    }
}

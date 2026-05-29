<?php

namespace Mautic\CoreBundle\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\FormInterface;
use Symfony\Component\Form\FormView;
use Symfony\Component\OptionsResolver\OptionsResolver;

/**
 * @extends AbstractType<mixed>
 */
class ButtonGroupType extends AbstractType
{
    public function getParent(): ?string
    {
        return ChoiceType::class;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'expanded'           => true,
            'multiple'           => false,
            'placeholder'        => false,
            'required'           => false,
            'label_attr'         => ['class' => 'col-form-label'],
            'button_group_class' => 'w-100',
        ]);
    }

    public function buildView(FormView $view, FormInterface $form, array $options): void
    {
        $view->vars['buttonBlockClass'] = $options['button_group_class'];
    }
}

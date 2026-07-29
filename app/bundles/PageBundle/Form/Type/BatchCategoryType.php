<?php

declare(strict_types=1);

namespace Mautic\PageBundle\Form\Type;

use Doctrine\DBAL\ArrayParameterType;
use Doctrine\ORM\QueryBuilder;
use Mautic\CategoryBundle\Entity\Category;
use Mautic\CategoryBundle\Entity\CategoryRepository;
use Mautic\CoreBundle\Form\Type\FormButtonsType;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\FormBuilderInterface;

final class BatchCategoryType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder->add('newCategory', EntityType::class, [
            'class' => Category::class,
            'choice_label' => 'title',
            'label_attr' => ['class' => 'control-label'],
            'query_builder' => static function (CategoryRepository $repository): QueryBuilder {
                $queryBuilder = $repository->createQueryBuilder('c');

                return $queryBuilder->where($queryBuilder->expr()->in('c.bundle', ':bundles'))
                    ->setParameter('bundles', ['page', 'global'], ArrayParameterType::STRING)
                    ->orderBy('c.title', 'ASC');
            },
        ])->add('ids', HiddenType::class)->add('buttons', FormButtonsType::class, [
            'apply_text' => false,
            'save_text' => 'mautic.core.form.save',
            'cancel_onclick' => 'javascript:void(0);',
            'cancel_attr' => ['data-dismiss' => 'modal'],
        ]);

        if (!empty($options['action'])) {
            $builder->setAction($options['action']);
        }
    }

    public function getBlockPrefix(): string
    {
        return 'page_batch';
    }
}

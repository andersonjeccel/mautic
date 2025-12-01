<?php

declare(strict_types=1);

namespace Mautic\LeadBundle\Model;

use Mautic\CoreBundle\Helper\InputHelper;
use Mautic\CoreBundle\Model\FormModel;
use Mautic\LeadBundle\Entity\LeadFieldGroup;
use Mautic\LeadBundle\Entity\LeadFieldGroupRepository;
use Mautic\LeadBundle\Form\Type\LeadFieldGroupType;
use Symfony\Component\Form\FormFactoryInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;

/**
 * @extends FormModel<LeadFieldGroup>
 */
class LeadFieldGroupModel extends FormModel
{
    public function getRepository(): LeadFieldGroupRepository
    {
        return $this->em->getRepository(LeadFieldGroup::class);
    }

    public function getPermissionBase(): string
    {
        return 'lead:fields';
    }

    /**
     * @param array<mixed> $options
     */
    public function createForm($entity, FormFactoryInterface $formFactory, $action = null, $options = []): \Symfony\Component\Form\FormInterface
    {
        if (!$entity instanceof LeadFieldGroup) {
            throw new MethodNotAllowedHttpException(['LeadFieldGroup']);
        }

        if (!empty($action)) {
            $options['action'] = $action;
        }

        return $formFactory->create(LeadFieldGroupType::class, $entity, $options);
    }

    public function getEntity($id = null): ?LeadFieldGroup
    {
        if (null === $id) {
            return new LeadFieldGroup();
        }

        return parent::getEntity($id);
    }

    public function saveEntity($entity, $unlock = true): void
    {
        if (!$entity instanceof LeadFieldGroup) {
            throw new MethodNotAllowedHttpException(['LeadFieldGroup']);
        }

        if ($entity->isNew()) {
            $entity->setOrder($this->getRepository()->getMaxOrder() + 1);
        }

        if (empty($entity->getAlias())) {
            $alias = InputHelper::alphanum($entity->getName(), false, '-');
            $alias = strtolower(preg_replace('/[^a-z0-9_]+/', '_', $alias));
            $entity->setAlias($this->ensureUniqueAlias($alias, $entity->getId()));
        }

        parent::saveEntity($entity, $unlock);
    }

    /**
     * @return array<string, string>
     */
    public function getGroupChoices(): array
    {
        return $this->getRepository()->getGroupChoices();
    }

    /**
     * @return LeadFieldGroup[]
     */
    public function getGroups(): array
    {
        return $this->getRepository()->getGroups();
    }

    private function ensureUniqueAlias(string $alias, ?int $excludeId = null): string
    {
        $originalAlias = $alias;
        $counter       = 1;

        while ($this->getRepository()->aliasExists($alias, $excludeId)) {
            $alias = $originalAlias.'_'.$counter;
            ++$counter;
        }

        return $alias;
    }
}

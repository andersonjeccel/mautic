<?php

declare(strict_types=1);

namespace Mautic\LeadBundle\Entity;

use Mautic\CoreBundle\Entity\CommonRepository;

/**
 * @extends CommonRepository<LeadFieldGroup>
 */
class LeadFieldGroupRepository extends CommonRepository
{
    /**
     * @return array<string, string>
     */
    public function getGroupChoices(): array
    {
        $qb = $this->createQueryBuilder('g');
        $qb->select('g.alias, g.name')
            ->orderBy('g.name', 'ASC');

        $results = $qb->getQuery()->getArrayResult();
        $choices = [];

        foreach ($results as $result) {
            $choices[$result['name']] = $result['alias'];
        }

        return $choices;
    }

    /**
     * @return LeadFieldGroup[]
     */
    public function getGroups(): array
    {
        $qb = $this->createQueryBuilder('g');
        $qb->orderBy('g.name', 'ASC');

        return $qb->getQuery()->getResult();
    }

    /**
     * Returns a mapping of group alias to group name.
     *
     * @return array<string, string>
     */
    public function getGroupNames(): array
    {
        $qb = $this->createQueryBuilder('g');
        $qb->select('g.alias, g.name')
            ->orderBy('g.name', 'ASC');

        $results = $qb->getQuery()->getArrayResult();
        $names   = [];

        foreach ($results as $result) {
            $names[$result['alias']] = $result['name'];
        }

        return $names;
    }

    public function getGroupByAlias(string $alias): ?LeadFieldGroup
    {
        return $this->findOneBy(['alias' => $alias]);
    }

    public function aliasExists(string $alias, ?int $excludeId = null): bool
    {
        $qb = $this->createQueryBuilder('g');
        $qb->select('COUNT(g.id)')
            ->where('g.alias = :alias')
            ->setParameter('alias', $alias);

        if (null !== $excludeId) {
            $qb->andWhere('g.id != :id')
                ->setParameter('id', $excludeId);
        }

        return (int) $qb->getQuery()->getSingleScalarResult() > 0;
    }

    public function getTableAlias(): string
    {
        return 'g';
    }
}

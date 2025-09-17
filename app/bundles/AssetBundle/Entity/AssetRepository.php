<?php

namespace Mautic\AssetBundle\Entity;

use Doctrine\Common\Collections\Order;
use Doctrine\ORM\NonUniqueResultException;
use Doctrine\ORM\NoResultException;
use Doctrine\ORM\Tools\Pagination\Paginator;
use Mautic\CoreBundle\Entity\CommonRepository;
use Mautic\FormBundle\Entity\Action;
use Mautic\ProjectBundle\Entity\ProjectRepositoryTrait;

/**
 * @extends CommonRepository<Asset>
 */
class AssetRepository extends CommonRepository
{
    use ProjectRepositoryTrait;

    /**
     * Get a list of entities.
     *
     * @return Paginator
     */
    public function getEntities(array $args = [])
    {
        $q = $this
            ->createQueryBuilder('a')
            ->select('a')
            ->leftJoin('a.category', 'c');

        $args['qb'] = $q;

        return parent::getEntities($args);
    }

    /**
     * @param string     $search
     * @param int        $limit
     * @param int        $start
     * @param bool|false $viewOther
     *
     * @return array
     */
    public function getAssetList($search = '', $limit = 10, $start = 0, $viewOther = false)
    {
        $q = $this->createQueryBuilder('a');
        $q->select('partial a.{id, title, path, alias, language}');

        if (!empty($search)) {
            $q->andWhere($q->expr()->like('a.title', ':search'))
                ->setParameter('search', "%{$search}%");
        }

        if (!$viewOther) {
            $q->andWhere($q->expr()->eq('a.createdBy', ':id'))
                ->setParameter('id', $this->currentUser->getId());
        }

        $q->orderBy('a.title');

        if (!empty($limit)) {
            $q->setFirstResult($start)
                ->setMaxResults($limit);
        }

        return $q->getQuery()->getArrayResult();
    }

    /**
     * @param \Doctrine\ORM\QueryBuilder|\Doctrine\DBAL\Query\QueryBuilder $q
     */
    protected function addCatchAllWhereClause($q, $filter): array
    {
        return $this->addStandardCatchAllWhereClause($q, $filter, [
            'a.title',
            'a.alias',
        ]);
    }

    /**
     * @param \Doctrine\ORM\QueryBuilder|\Doctrine\DBAL\Query\QueryBuilder $q
     */
    protected function addSearchCommandWhereClause($q, $filter): array
    {
        [$expr, $parameters] = $this->addStandardSearchCommandWhereClause($q, $filter);
        if ($expr) {
            return [$expr, $parameters];
        }

        $command         = $field         = $filter->command;
        $unique          = $this->generateRandomParameterName();
        $returnParameter = false; // returning a parameter that is not used will lead to a Doctrine error
        switch ($command) {
            case $this->translator->trans('mautic.asset.asset.searchcommand.isexpired'):
            case $this->translator->trans('mautic.asset.asset.searchcommand.isexpired', [], null, 'en_US'):
                $expr = sprintf(
                    "(a.isPublished = :%1\$s AND a.publishDown IS NOT NULL AND a.publishDown <> '' AND a.publishDown < CURRENT_TIMESTAMP())",
                    $unique
                );
                $forceParameters = [$unique => true];
                break;
            case $this->translator->trans('mautic.asset.asset.searchcommand.ispending'):
            case $this->translator->trans('mautic.asset.asset.searchcommand.ispending', [], null, 'en_US'):
                $expr = sprintf(
                    "(a.isPublished = :%1\$s AND a.publishUp IS NOT NULL AND a.publishUp <> '' AND a.publishUp > CURRENT_TIMESTAMP())",
                    $unique
                );
                $forceParameters = [$unique => true];
                break;
            case $this->translator->trans('mautic.asset.asset.searchcommand.attached_to_form'):
            case $this->translator->trans('mautic.asset.asset.searchcommand.attached_to_form', [], null, 'en_US'):
                $typeParameter = $this->generateRandomParameterName();
                $subQ          = $this->_em->createQueryBuilder();
                $patternInt    = $subQ->expr()->concat(
                    $subQ->expr()->concat($subQ->expr()->literal('%s:5:"asset";i:'), 'a.id'),
                    $subQ->expr()->literal(';%')
                );
                $patternString = $subQ->expr()->concat(
                    $subQ->expr()->concat($subQ->expr()->literal('%s:5:"asset";s:%:"'), 'a.id'),
                    $subQ->expr()->literal('";%')
                );

                $subExpr = $subQ->expr()->orX(
                    $subQ->expr()->like('fa.properties', $patternInt),
                    $subQ->expr()->like('fa.properties', $patternString)
                );

                $subQ->select('1')
                    ->from(Action::class, 'fa')
                    ->where($subQ->expr()->eq('fa.type', ":$typeParameter"))
                    ->andWhere($subExpr);

                $expr            = $q->expr()->exists($subQ->getDQL());
                $forceParameters = [$typeParameter => 'asset.download'];
                $returnParameter = false;
                break;
            case $this->translator->trans('mautic.asset.asset.searchcommand.local'):
            case $this->translator->trans('mautic.asset.asset.searchcommand.local', [], null, 'en_US'):
                $expr            = $q->expr()->eq('a.storageLocation', ":$unique");
                $forceParameters = [$unique => 'local'];
                break;
            case $this->translator->trans('mautic.asset.asset.searchcommand.remote'):
            case $this->translator->trans('mautic.asset.asset.searchcommand.remote', [], null, 'en_US'):
                $expr            = $q->expr()->eq('a.storageLocation', ":$unique");
                $forceParameters = [$unique => 'remote'];
                break;
            case $this->translator->trans('mautic.asset.asset.searchcommand.lang'):
                $langUnique      = $this->generateRandomParameterName();
                $langValue       = $filter->string.'_%';
                $forceParameters = [
                    $langUnique => $langValue,
                    $unique     => $filter->string,
                ];
                $expr            = '('.$q->expr()->eq('a.language', ":$unique").' OR '.$q->expr()->like('a.language', ":$langUnique").')';
                $returnParameter = true;
                break;
            case $this->translator->trans('mautic.project.searchcommand.name'):
            case $this->translator->trans('mautic.project.searchcommand.name', [], null, 'en_US'):
                return $this->handleProjectFilter(
                    $this->_em->getConnection()->createQueryBuilder(),
                    'asset_id',
                    'asset_projects_xref',
                    $this->getTableAlias(),
                    $filter->string,
                    $filter->not
                );
        }

        if ($expr && $filter->not) {
            $expr = $q->expr()->not($expr);
        }

        if (!empty($forceParameters)) {
            $parameters = $forceParameters;
        } elseif (!$returnParameter) {
            $parameters = [];
        } else {
            $string     = ($filter->strict) ? $filter->string : "%{$filter->string}%";
            $parameters = ["$unique" => $string];
        }

        return [$expr, $parameters];
    }

    /**
     * @return string[]
     */
    public function getSearchCommands(): array
    {
        $commands = [
            'mautic.core.searchcommand.ispublished',
            'mautic.core.searchcommand.isunpublished',
            'mautic.core.searchcommand.isuncategorized',
            'mautic.core.searchcommand.ismine',
            'mautic.asset.asset.searchcommand.isexpired',
            'mautic.asset.asset.searchcommand.ispending',
            'mautic.core.searchcommand.category',
            'mautic.asset.asset.searchcommand.attached_to_form',
            'mautic.asset.asset.searchcommand.local',
            'mautic.asset.asset.searchcommand.remote',
            'mautic.asset.asset.searchcommand.lang',
            'mautic.project.searchcommand.name',
        ];

        return array_merge($commands, parent::getSearchCommands());
    }

    /**
     * @return array<array<string>>
     */
    protected function getDefaultOrder(): array
    {
        return [
            ['a.title', 'ASC'],
        ];
    }

    public function getTableAlias(): string
    {
        return 'a';
    }

    /**
     * Gets the sum size of assets.
     */
    public function getAssetSize(array $assets): int
    {
        $q = $this->_em->getConnection()->createQueryBuilder();
        $q->select('sum(a.size) as total_size')
            ->from(MAUTIC_TABLE_PREFIX.'assets', 'a')
            ->where('a.id IN (:assetIds)')
            ->setParameter('assetIds', $assets, \Doctrine\DBAL\ArrayParameterType::INTEGER);

        $result = $q->executeQuery()->fetchAllAssociative();

        return (int) $result[0]['total_size'];
    }

    /**
     * @param int        $increaseBy
     * @param bool|false $unique
     */
    public function upDownloadCount($id, $increaseBy = 1, $unique = false): void
    {
        $q = $this->_em->getConnection()->createQueryBuilder();

        $q->update(MAUTIC_TABLE_PREFIX.'assets')
            ->set('download_count', 'download_count + '.(int) $increaseBy)
            ->where('id = '.(int) $id);

        if ($unique) {
            $q->set('unique_download_count', 'unique_download_count + '.(int) $increaseBy);
        }

        $q->executeStatement();
    }

    /**
     * @param int $categoryId
     *
     * @return Asset
     *
     * @throws NoResultException
     * @throws NonUniqueResultException
     */
    public function getLatestAssetForCategory($categoryId)
    {
        $q = $this->createQueryBuilder($this->getTableAlias());
        $q->where($this->getTableAlias().'.category = :categoryId');
        $q->andWhere($this->getTableAlias().'.isPublished = TRUE');
        $q->setParameter('categoryId', $categoryId);
        $q->orderBy($this->getTableAlias().'.dateAdded', Order::Descending->value);
        $q->setMaxResults(1);

        return $q->getQuery()->getSingleResult();
    }
}

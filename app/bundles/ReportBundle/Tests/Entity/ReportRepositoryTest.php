<?php

declare(strict_types=1);

namespace Mautic\ReportBundle\Tests\Entity;

use Doctrine\ORM\Query\Expr;
use Doctrine\ORM\QueryBuilder;
use Mautic\CoreBundle\Test\Doctrine\RepositoryConfiguratorTrait;
use Mautic\ReportBundle\Entity\Report;
use Mautic\ReportBundle\Entity\ReportRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Contracts\Translation\TranslatorInterface;

class ReportRepositoryTest extends TestCase
{
    use RepositoryConfiguratorTrait;

    private function getRepository(): ReportRepository
    {
        $repository = $this->configureRepository(Report::class);

        $translator = $this->createMock(TranslatorInterface::class);
        $translator->method('trans')->willReturnCallback(
            fn (string $id, array $parameters = [], ?string $domain = null, ?string $locale = null) => match ($id) {
                'mautic.report.report.searchcommand.source'  => 'source',
                default                                      => $id,
            }
        );

        $repository->setTranslator($translator);
        $this->entityManager->method('getExpressionBuilder')->willReturn(new Expr());

        return $repository;
    }

    public function testAddSearchCommandWhereClauseFiltersBySource(): void
    {
        $repository = $this->getRepository();
        $qb         = new QueryBuilder($this->entityManager);
        $filter     = (object) ['command' => 'source', 'string' => 'contacts', 'not' => false, 'strict' => true];

        $method = new \ReflectionMethod(ReportRepository::class, 'addSearchCommandWhereClause');
        $method->setAccessible(true);

        [$expr, $params] = $method->invoke($repository, $qb, $filter);

        $parameterName = array_key_first($params);

        self::assertNotFalse($expr);
        self::assertNotNull($parameterName);
        self::assertStringStartsWith('par', $parameterName);
        self::assertSame('contacts', $params[$parameterName]);
        self::assertSame(sprintf('r.source = :%s', $parameterName), (string) $expr);
    }

    public function testAddSearchCommandWhereClauseSupportsNegation(): void
    {
        $repository = $this->getRepository();
        $qb         = new QueryBuilder($this->entityManager);
        $filter     = (object) ['command' => 'source', 'string' => 'campaigns', 'not' => true, 'strict' => true];

        $method = new \ReflectionMethod(ReportRepository::class, 'addSearchCommandWhereClause');
        $method->setAccessible(true);

        [$expr, $params] = $method->invoke($repository, $qb, $filter);

        $parameterName = array_key_first($params);

        self::assertNotFalse($expr);
        self::assertNotNull($parameterName);
        self::assertStringStartsWith('par', $parameterName);
        self::assertSame('campaigns', $params[$parameterName]);
        self::assertSame(sprintf('NOT(r.source = :%s)', $parameterName), (string) $expr);
    }

    public function testAddSearchCommandWhereClauseSupportsDelimitedSources(): void
    {
        $repository = $this->getRepository();
        $qb         = new QueryBuilder($this->entityManager);
        $filter     = (object) ['command' => 'source', 'string' => 'segment.log', 'not' => false, 'strict' => true];

        $method = new \ReflectionMethod(ReportRepository::class, 'addSearchCommandWhereClause');
        $method->setAccessible(true);

        [$expr, $params] = $method->invoke($repository, $qb, $filter);

        $parameterName = array_key_first($params);

        self::assertNotFalse($expr);
        self::assertNotNull($parameterName);
        self::assertStringStartsWith('par', $parameterName);
        self::assertSame('segment.log', $params[$parameterName]);
        self::assertSame(sprintf('r.source = :%s', $parameterName), (string) $expr);
    }

    public function testGetSearchCommandsContainsSourceFilter(): void
    {
        $repository = $this->getRepository();

        self::assertContains('mautic.report.report.searchcommand.source', $repository->getSearchCommands());
    }
}

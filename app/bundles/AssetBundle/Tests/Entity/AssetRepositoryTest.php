<?php

declare(strict_types=1);

namespace Mautic\AssetBundle\Tests\Entity;

use Doctrine\DBAL\Query\QueryBuilder;
use Doctrine\ORM\EntityManagerInterface;
use Mautic\AssetBundle\Entity\Asset;
use Mautic\AssetBundle\Entity\AssetRepository;
use Mautic\CoreBundle\Test\Doctrine\RepositoryConfiguratorTrait;
use Mautic\CoreBundle\Test\MauticMysqlTestCase;
use Mautic\FormBundle\Entity\Action;
use Mautic\FormBundle\Entity\Form;
use PHPUnit\Framework\TestCase;
use Symfony\Contracts\Translation\TranslatorInterface;

class AssetRepositoryTest extends MauticMysqlTestCase
{
    private Asset $localAsset;

    private Asset $remoteAsset;

    private TranslatorInterface $translator;

    private AssetRepository $repository;

    private EntityManagerInterface $entityManager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->entityManager = self::getContainer()->get('doctrine.orm.entity_manager');
        $this->translator    = self::getContainer()->get('translator');

        $this->truncateTables(
            'asset_projects_xref',
            'asset_downloads',
            'form_actions',
            'form_projects_xref',
            'forms',
            'assets'
        );

        $this->localAsset = $this->createAsset([
            'title'           => 'Local asset',
            'alias'           => 'local-asset',
            'storageLocation' => 'local',
            'path'            => 'local.pdf',
        ]);

        $this->remoteAsset = $this->createAsset([
            'title'           => 'Remote asset',
            'alias'           => 'remote-asset',
            'storageLocation' => 'remote',
            'remotePath'      => 'https://example.com/remote.pdf',
        ]);

        $this->attachAssetToForm($this->localAsset);

        /** @var AssetRepository $repository */
        $repository       = $this->entityManager->getRepository(Asset::class);
        $this->repository = $repository;
        $this->repository->setTranslator($this->translator);
        $userHelper = self::getContainer()->get('mautic.helper.user');
        $this->repository->setCurrentUser($userHelper->getUser());
    }

    public function testLocalSearchCommandReturnsLocalAsset(): void
    {
        $search = $this->translator->trans('mautic.asset.asset.searchcommand.local', [], null, 'en_US');

        $this->assertSame([
            $this->localAsset->getId(),
        ], $this->getSearchResultIds($search));
    }

    public function testRemoteSearchCommandReturnsRemoteAsset(): void
    {
        $search = $this->translator->trans('mautic.asset.asset.searchcommand.remote', [], null, 'en_US');

        $this->assertSame([
            $this->remoteAsset->getId(),
        ], $this->getSearchResultIds($search));
    }

    public function testAttachedToFormSearchCommandReturnsAttachedAssets(): void
    {
        $search = $this->translator->trans('mautic.asset.asset.searchcommand.attached_to_form', [], null, 'en_US');

        $this->assertSame([
            $this->localAsset->getId(),
        ], $this->getSearchResultIds($search));
    }

    public function testNegatedAttachedToFormSearchCommandExcludesAttachedAssets(): void
    {
        $search = '!'.$this->translator->trans('mautic.asset.asset.searchcommand.attached_to_form', [], null, 'en_US');

        $this->assertSame([
            $this->remoteAsset->getId(),
        ], $this->getSearchResultIds($search));
    }

    /**
     * @param array<string, mixed> $data
     */
    private function createAsset(array $data): Asset
    {
        $asset = new Asset();
        $asset->setTitle($data['title']);
        $asset->setAlias($data['alias']);
        $asset->setStorageLocation($data['storageLocation']);
        $asset->setLanguage($data['language'] ?? 'en');
        $asset->setIsPublished(true);
        $asset->setDateAdded(new \DateTime());
        $asset->setDateModified(new \DateTime());

        if (isset($data['path'])) {
            $asset->setPath($data['path']);
        }

        if (isset($data['remotePath'])) {
            $asset->setRemotePath($data['remotePath']);
        }

        $originalFileName = $data['originalFileName'] ?? ($data['path'] ?? ($data['remotePath'] ?? ($data['alias'].'.dat')));
        $asset->setOriginalFileName($originalFileName);
        $asset->setExtension($data['extension'] ?? 'txt');
        $asset->setSize((int) ($data['size'] ?? 0));

        $this->entityManager->persist($asset);
        $this->entityManager->flush();

        return $asset;
    }

    private function attachAssetToForm(Asset $asset): void
    {
        $form = new Form();
        $form->setName('Attachment form '.$asset->getId());
        $form->setAlias('attachment-form-'.$asset->getId());
        $form->setFormType('standalone');
        $form->setIsPublished(true);
        $form->setDateAdded(new \DateTime());
        $form->setDateModified(new \DateTime());
        $form->setPublishUp(new \DateTime());

        $action = new Action();
        $action->setType('asset.download');
        $action->setOrder(1);
        $action->setForm($form);
        $action->setProperties([
            'asset'    => (string) $asset->getId(),
            'category' => null,
            'message'  => '',
        ]);

        $form->addAction('new', $action);

        $this->entityManager->persist($form);
        $this->entityManager->flush();
    }

    /**
     * @return int[]
     */
    private function getSearchResultIds(string $search): array
    {
        $ids = [];

        foreach ($this->repository->getEntities(['filter' => ['string' => $search]]) as $asset) {
            \assert($asset instanceof Asset);
            $ids[] = $asset->getId();
        }

        sort($ids);

        return $ids;
    }

    private function getUnitTestRepository(): AssetRepository
    {
        $repository = new class() extends AssetRepository {
            use RepositoryConfiguratorTrait;

            public function __construct()
            {
                // Empty constructor for unit test setup
            }

            public function setupForUnitTest(): void
            {
                $this->configureRepository(Asset::class);
            }
        };

        $repository->setupForUnitTest();

        $translator = $this->createMock(TranslatorInterface::class);
        $translator->method('trans')->willReturnCallback(fn ($id) => match ($id) {
            'mautic.asset.asset.searchcommand.isexpired' => 'is:expired',
            'mautic.asset.asset.searchcommand.ispending' => 'is:pending',
            default                                      => $id,
        });
        $repository->setTranslator($translator);

        return $repository;
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('dataExpirationFilters')]
    public function testAddSearchCommandWhereClauseHandlesExpirationFilters(string $command, string $expected): void
    {
        $repository = $this->getUnitTestRepository();
        $connection = $this->createMock(\Doctrine\DBAL\Connection::class);
        $qb         = new QueryBuilder($connection);
        $filter     = (object) ['command' => $command, 'string' => '', 'not' => false, 'strict' => false];

        $method = new \ReflectionMethod(AssetRepository::class, 'addSearchCommandWhereClause');
        $method->setAccessible(true);

        [$expr, $params] = $method->invoke($repository, $qb, $filter);

        self::assertSame($expected, (string) $expr);
        self::assertArrayHasKey('par1', $params);
        self::assertSame(true, $params['par1']);
    }

    /**
     * @return iterable<array{0: string, 1: string}>
     */
    public static function dataExpirationFilters(): iterable
    {
        yield ['is:expired', "(a.isPublished = :par1 AND a.publishDown IS NOT NULL AND a.publishDown <> '' AND a.publishDown < CURRENT_TIMESTAMP())"];
        yield ['is:pending', "(a.isPublished = :par1 AND a.publishUp IS NOT NULL AND a.publishUp <> '' AND a.publishUp > CURRENT_TIMESTAMP())"];
    }

    public function testGetSearchCommandsContainsAllFilters(): void
    {
        $commands = $this->repository->getSearchCommands();
        self::assertContains('mautic.asset.asset.searchcommand.isexpired', $commands);
        self::assertContains('mautic.asset.asset.searchcommand.ispending', $commands);
        self::assertContains('mautic.asset.asset.searchcommand.attached_to_form', $commands);
        self::assertContains('mautic.asset.asset.searchcommand.local', $commands);
        self::assertContains('mautic.asset.asset.searchcommand.remote', $commands);
    }
}

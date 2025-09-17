<?php

namespace MauticPlugin\MauticTagManagerBundle\Tests\Functional\Entity;

use Mautic\CoreBundle\Test\MauticMysqlTestCase;
use Mautic\LeadBundle\Entity\Tag;
use Mautic\LeadBundle\Model\LeadModel;
use MauticPlugin\MauticTagManagerBundle\Entity\TagRepository;
use PHPUnit\Framework\Assert;

class TagRepositoryTest extends MauticMysqlTestCase
{
    private TagRepository $tagRepository;

    private LeadModel $leadModel;

    /**
     * @var array<string, Tag>
     */
    private array $tags = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->tagRepository = self::getContainer()->get('mautic.tagmanager.repository.tag');
        $this->tagRepository->setTranslator(self::getContainer()->get('translator'));
        $this->leadModel      = self::getContainer()->get('mautic.lead.model.lead');
        $this->tags           = [];

        $tags = [
            'tag1',
            'tag2',
            'tag3',
            'tag4',
        ];

        foreach ($tags as $tagName) {
            $tag = new Tag();
            $tag->setTag($tagName);
            $this->tagRepository->saveEntity($tag);
            $this->tags[$tagName] = $tag;
        }
    }

    public function testCountOccurencesReturnsCorrectQuantityOfTags(): void
    {
        $count = $this->tagRepository->countOccurrences('tag2');
        Assert::assertSame(1, $count);
    }

    public function testHasContactsSearchCommandReturnsTagsWithContacts(): void
    {
        $this->createLeadWithTags(['tag1']);

        $results = $this->tagRepository->getEntities([
            'filter' => ['string' => 'has:contacts'],
        ]);

        $tags = [];
        foreach ($results as $tag) {
            \assert($tag instanceof Tag);
            $tags[] = $tag->getTag();
        }

        Assert::assertSame(['tag1'], $tags);
    }

    public function testUnusedSearchCommandReturnsTagsWithoutContacts(): void
    {
        $this->createLeadWithTags(['tag1']);

        $results = $this->tagRepository->getEntities([
            'filter' => ['string' => 'is:unused'],
        ]);

        $tags = [];
        foreach ($results as $tag) {
            \assert($tag instanceof Tag);
            $tags[] = $tag->getTag();
        }

        sort($tags);

        Assert::assertSame(['tag2', 'tag3', 'tag4'], $tags);
    }

    /**
     * @param string[] $tagNames
     */
    private function createLeadWithTags(array $tagNames): void
    {
        $lead = $this->leadModel->getEntity();
        $lead->setEmail(uniqid('tag-search-', true).'@example.com');
        $lead->setFirstname('Tag');
        $lead->setLastname('Search');

        foreach ($tagNames as $tagName) {
            $lead->addTag($this->tags[$tagName]);
        }

        $this->leadModel->saveEntity($lead);
    }
}

<?php

declare(strict_types=1);

namespace Mautic\PointBundle\Tests\Functional\Controller;

use Mautic\CoreBundle\Test\MauticMysqlTestCase;
use Mautic\PointBundle\Entity\Point;
use Mautic\ProjectBundle\Entity\Project;

final class PointControllerTest extends MauticMysqlTestCase
{
    public function testPointGroupsListShowsQuickFilters(): void
    {
        $crawler = $this->client->request('GET', '/s/points/groups');

        $this->assertResponseIsSuccessful();
        $quickFilters = $crawler->filter('button[data-toggle="popover"]');
        $this->assertSame(1, $quickFilters->count());
        $filterContent = html_entity_decode((string) $quickFilters->attr('data-content'), ENT_QUOTES);
        $this->assertStringContainsString('Active', $filterContent);
        $this->assertStringContainsString('Inactive', $filterContent);
        $this->assertStringContainsString('Uncategorized', $filterContent);
        $this->assertStringContainsString('My items', $filterContent);
        $this->assertStringContainsString('Mautic.toggleFilter(this, true)', $filterContent);
    }

    public function testPointWithProject(): void
    {
        $point = new Point();
        $point->setName('test');
        $point->setType('url.hit');
        $this->em->persist($point);

        $project = new Project();
        $project->setName('Test Project');
        $this->em->persist($project);

        $this->em->flush();
        $this->em->clear();

        $crawler = $this->client->request('GET', '/s/points/edit/'.$point->getId());
        $form    = $crawler->selectButton('Save')->form();
        $form['point[projects]']->setValue((string) $project->getId());

        $this->client->submit($form);

        $this->assertResponseIsSuccessful();

        $savedAsset = $this->em->find(Point::class, $point->getId());
        $this->assertInstanceOf(Point::class, $savedAsset);
        $this->assertSame($project->getId(), $savedAsset->getProjects()->first()->getId());
    }
}

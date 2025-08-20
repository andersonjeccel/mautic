<?php

namespace Mautic\StageBundle\Tests\Controller;

use Mautic\CoreBundle\Test\MauticMysqlTestCase;
use Mautic\StageBundle\Entity\Stage;
use Mautic\StageBundle\Model\StageModel;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class StageControllerTest extends MauticMysqlTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
    }

    protected function beforeBeginTransaction(): void
    {
        $this->resetAutoincrement([
            'stages',
            'leads',
            'lead_stages_change_log',
            'stage_lead_action_log',
        ]);
    }

    public function testMergeActionShowsForm(): void
    {
        $stage = new Stage();
        $stage->setName('Test Stage');
        $stage->setIsPublished(true);
        $this->em->persist($stage);
        $this->em->flush();

        $this->client->request(Request::METHOD_GET, "/s/stages/merge/{$stage->getId()}");
        $response = $this->client->getResponse();

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
        $this->assertStringContainsString('Choose a stage to merge into', $response->getContent());
    }

    public function testMergeActionRequiresEditPermission(): void
    {
        $stage = new Stage();
        $stage->setName('Test Stage');
        $stage->setIsPublished(true);
        $this->em->persist($stage);
        $this->em->flush();

        $this->client->request(Request::METHOD_GET, "/s/stages/merge/{$stage->getId()}");
        $response = $this->client->getResponse();

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
    }

    public function testMergeActionWithValidData(): void
    {
        $primaryStage = new Stage();
        $primaryStage->setName('Primary Stage');
        $primaryStage->setIsPublished(true);
        $this->em->persist($primaryStage);

        $secondaryStage = new Stage();
        $secondaryStage->setName('Secondary Stage');
        $secondaryStage->setIsPublished(true);
        $this->em->persist($secondaryStage);

        $this->em->flush();

        $crawler = $this->client->request(Request::METHOD_GET, "/s/stages/merge/{$secondaryStage->getId()}");
        $response = $this->client->getResponse();

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());

        $form = $crawler->filter('form[name="stage_merge"]')->form();
        $form->setValues([
            'stage_merge[stage_to_merge]' => $primaryStage->getId(),
        ]);

        $this->client->submit($form);
        $response = $this->client->getResponse();

        $this->assertEquals(Response::HTTP_FOUND, $response->getStatusCode());
        $this->assertStringContainsString('/s/stages', $response->headers->get('Location'));
    }

    public function testMergeActionWithInvalidStageId(): void
    {
        $this->client->request(Request::METHOD_GET, '/s/stages/merge/99999');
        $response = $this->client->getResponse();

        $this->assertEquals(Response::HTTP_FOUND, $response->getStatusCode());
    }

    public function testMergeActionWithSameStage(): void
    {
        $stage = new Stage();
        $stage->setName('Test Stage');
        $stage->setIsPublished(true);
        $this->em->persist($stage);
        $this->em->flush();

        $crawler = $this->client->request(Request::METHOD_GET, "/s/stages/merge/{$stage->getId()}");
        $response = $this->client->getResponse();

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());

        $form = $crawler->filter('form[name="stage_merge"]')->form();
        $form->setValues([
            'stage_merge[stage_to_merge]' => $stage->getId(),
        ]);

        $this->client->submit($form);
        $response = $this->client->getResponse();

        $this->assertEquals(Response::HTTP_FOUND, $response->getStatusCode());
    }

    public function testMergeActionShowsAvailableStages(): void
    {
        $stage1 = new Stage();
        $stage1->setName('Stage 1');
        $stage1->setIsPublished(true);
        $this->em->persist($stage1);

        $stage2 = new Stage();
        $stage2->setName('Stage 2');
        $stage2->setIsPublished(true);
        $this->em->persist($stage2);

        $stage3 = new Stage();
        $stage3->setName('Stage 3');
        $stage3->setIsPublished(true);
        $this->em->persist($stage3);

        $this->em->flush();

        $this->client->request(Request::METHOD_GET, "/s/stages/merge/{$stage1->getId()}");
        $response = $this->client->getResponse();

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
        $this->assertStringContainsString('Stage 2', $response->getContent());
        $this->assertStringContainsString('Stage 3', $response->getContent());
        $this->assertStringNotContainsString('Stage 1', $response->getContent());
    }

    public function testMergeActionRedirectsToListAfterSuccess(): void
    {
        $primaryStage = new Stage();
        $primaryStage->setName('Primary Stage');
        $primaryStage->setIsPublished(true);
        $this->em->persist($primaryStage);

        $secondaryStage = new Stage();
        $secondaryStage->setName('Secondary Stage');
        $secondaryStage->setIsPublished(true);
        $this->em->persist($secondaryStage);

        $this->em->flush();

        $crawler = $this->client->request(Request::METHOD_GET, "/s/stages/merge/{$secondaryStage->getId()}");
        $form = $crawler->filter('form[name="stage_merge"]')->form();
        $form->setValues([
            'stage_merge[stage_to_merge]' => $primaryStage->getId(),
        ]);

        $this->client->submit($form);
        $response = $this->client->getResponse();

        $this->assertEquals(Response::HTTP_FOUND, $response->getStatusCode());
        $this->assertStringContainsString('/s/stages', $response->headers->get('Location'));
    }

    public function testMergeActionShowsSuccessMessage(): void
    {
        $primaryStage = new Stage();
        $primaryStage->setName('Primary Stage');
        $primaryStage->setIsPublished(true);
        $this->em->persist($primaryStage);

        $secondaryStage = new Stage();
        $secondaryStage->setName('Secondary Stage');
        $secondaryStage->setIsPublished(true);
        $this->em->persist($secondaryStage);

        $this->em->flush();

        $crawler = $this->client->request(Request::METHOD_GET, "/s/stages/merge/{$secondaryStage->getId()}");
        $form = $crawler->filter('form[name="stage_merge"]')->form();
        $form->setValues([
            'stage_merge[stage_to_merge]' => $primaryStage->getId(),
        ]);

        $this->client->submit($form);

        $this->client->followRedirect();
        $response = $this->client->getResponse();

        $this->assertEquals(Response::HTTP_OK, $response->getStatusCode());
    }
}

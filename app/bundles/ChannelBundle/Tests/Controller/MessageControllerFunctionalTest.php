<?php

declare(strict_types=1);

namespace Mautic\ChannelBundle\Tests\Controller;

use Mautic\ChannelBundle\Entity\Channel;
use Mautic\ChannelBundle\Entity\Message;
use Mautic\CoreBundle\Test\MauticMysqlTestCase;
use Mautic\ProjectBundle\Entity\Project;

final class MessageControllerFunctionalTest extends MauticMysqlTestCase
{
    public function testFormOpensFirstEnabledChannel(): void
    {
        $message = new Message();
        $message->setName('Message with an enabled channel');
        $message->addChannel(
            (new Channel())
                ->setChannel('email')
                ->setIsEnabled(true)
                ->setMessage($message)
        );

        $this->em->persist($message);
        $this->em->flush();
        $this->em->clear();

        $crawler = $this->client->request('GET', '/s/messages/edit/'.$message->getId());

        $this->assertResponseIsSuccessful();
        $this->assertSame('active', $crawler->filter('li[data-tab-id="channel_email"]')->attr('class'));
    }

    public function testFormWithProject(): void
    {
        $message = new Message();
        $message->setName('Test message');
        $this->em->persist($message);

        $project = new Project();
        $project->setName('Test Project');
        $this->em->persist($project);

        $this->em->flush();
        $this->em->clear();

        $crawler = $this->client->request('GET', '/s/messages/edit/'.$message->getId());
        $form    = $crawler->selectButton('Save')->form();
        $form['message[projects]']->setValue((string) $project->getId());

        $this->client->submit($form);

        $this->assertResponseIsSuccessful();

        $savedMessage = $this->em->find(Message::class, $message->getId());
        $this->assertInstanceOf(Message::class, $savedMessage);
        $this->assertSame($project->getId(), $savedMessage->getProjects()->first()->getId());
    }
}

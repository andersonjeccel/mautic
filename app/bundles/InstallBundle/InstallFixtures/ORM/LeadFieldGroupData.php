<?php

declare(strict_types=1);

namespace Mautic\InstallBundle\InstallFixtures\ORM;

use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Common\DataFixtures\AbstractFixture;
use Doctrine\Common\DataFixtures\OrderedFixtureInterface;
use Doctrine\Persistence\ObjectManager;
use Mautic\LeadBundle\Entity\LeadFieldGroup;

class LeadFieldGroupData extends AbstractFixture implements OrderedFixtureInterface, FixtureGroupInterface
{
    public static function getGroups(): array
    {
        return ['group_install', 'group_mautic_install_data'];
    }

    public function load(ObjectManager $manager): void
    {
        $groups = [
            ['name' => 'Core', 'alias' => 'core'],
            ['name' => 'Social', 'alias' => 'social'],
            ['name' => 'Personal', 'alias' => 'personal'],
            ['name' => 'Professional', 'alias' => 'professional'],
        ];

        foreach ($groups as $groupData) {
            $existing = $manager->getRepository(LeadFieldGroup::class)->findOneBy(['alias' => $groupData['alias']]);

            if ($existing) {
                continue;
            }

            $group = new LeadFieldGroup();
            $group->setName($groupData['name']);
            $group->setAlias($groupData['alias']);
            $group->setIsSystem(true);

            $manager->persist($group);
            $manager->flush();

            $this->addReference('leadfieldgroup-'.$groupData['alias'], $group);
        }
    }

    public function getOrder(): int
    {
        return 3;
    }
}

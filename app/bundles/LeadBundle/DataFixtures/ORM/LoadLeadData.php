<?php

namespace Mautic\LeadBundle\DataFixtures\ORM;

use Doctrine\Common\DataFixtures\AbstractFixture;
use Doctrine\Common\DataFixtures\OrderedFixtureInterface;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ObjectManager;
use Mautic\CoreBundle\Entity\IpAddress;
use Mautic\CoreBundle\Helper\CsvHelper;
use Mautic\LeadBundle\Entity\Company;
use Mautic\LeadBundle\Entity\CompanyLead;
use Mautic\LeadBundle\Entity\Lead;
use Mautic\UserBundle\Entity\User;

class LoadLeadData extends AbstractFixture implements OrderedFixtureInterface
{
    public function load(ObjectManager $manager): void
    {
        $today     = new \DateTime();
        $leads     = CsvHelper::csv_to_array(__DIR__.'/fakeleaddata.csv');
        $salesUser = $manager->getRepository(User::class)->findOneBy(['username' => 'sales']);
        \assert($manager instanceof EntityManagerInterface);

        /** @var array<int, Company> $managedCompanies */
        $managedCompanies = [];
        for ($companyIndex = 0; $companyIndex <= 3; ++$companyIndex) {
            if (!$this->hasReference('company-'.$companyIndex)) {
                continue;
            }

            $company = $this->getReference('company-'.$companyIndex);
            \assert($company instanceof Company);
            $managedCompany = $manager->getReference(Company::class, $company->getId());
            \assert($managedCompany instanceof Company);
            $managedCompanies[$companyIndex] = $managedCompany;
        }

        foreach ($leads as $count => $l) {
            $key  = $count + 1;
            $lead = new Lead();
            $lead->setDateAdded($today);
            $ipAddress = new IpAddress();
            $ipAddress->setIpAddress($l['ip']);
            $this->setReference('ipAddress-'.$key, $ipAddress);
            unset($l['ip']);
            $lead->addIpAddress($ipAddress);

            if ($salesUser instanceof User) {
                $lead->setOwner($salesUser);
            }

            foreach ($l as $col => $val) {
                $lead->addUpdatedField($col, $val);
            }

            $manager->persist($lead);

            $this->setReference('lead-'.$count, $lead);

            // Assign to companies in a predictable way
            $lastCharacter = (int) substr($count, -1, 1);
            if (isset($managedCompanies[$lastCharacter])) {
                $companyLead = new CompanyLead();
                $companyLead->setLead($lead);
                $companyLead->setCompany($managedCompanies[$lastCharacter]);
                $companyLead->setDateAdded($today);
                $companyLead->setPrimary(true);
                $manager->persist($companyLead);
            }
        }

        $manager->flush();
    }

    public function getOrder(): int
    {
        return 5;
    }
}

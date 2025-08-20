<?php

declare(strict_types=1);

namespace Mautic\LeadBundle\Command;

use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'mautic:tags:remove-expired',
    description: 'Remove expired tag assignments',
)]
class RemoveExpiredTagsCommand extends Command
{
    public function __construct(private Connection $connection)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $qb = $this->connection->createQueryBuilder();
        $affected = $qb->delete(MAUTIC_TABLE_PREFIX.'lead_tags_xref')
            ->where('expires_at IS NOT NULL')
            ->andWhere('expires_at < :now')
            ->setParameter('now', (new \DateTime())->format('Y-m-d H:i:s'))
            ->executeStatement();

        $output->writeln(sprintf('Removed %d expired tag assignments.', $affected));

        return Command::SUCCESS;
    }
}

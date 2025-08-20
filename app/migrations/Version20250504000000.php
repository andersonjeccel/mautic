<?php

declare(strict_types=1);

namespace Mautic\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\DBAL\Types\Types;
use Mautic\CoreBundle\Doctrine\PreUpAssertionMigration;

final class Version20250504000000 extends PreUpAssertionMigration
{
    protected const TABLE_NAME = 'lead_tags_xref';

    protected function preUpAssertions(): void
    {
        $this->skipAssertion(
            fn (Schema $schema) => $schema->getTable($this->getPrefixedTableName())->hasColumn('expires_at'),
            sprintf('Column %s already exists', 'expires_at')
        );
    }

    public function up(Schema $schema): void
    {
        $table = $schema->getTable($this->getPrefixedTableName());
        $table->addColumn('expires_at', Types::DATETIME_MUTABLE, ['notnull' => false]);
    }
}

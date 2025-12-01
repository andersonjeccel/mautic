<?php

declare(strict_types=1);

namespace Mautic\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Mautic\CoreBundle\Doctrine\AbstractMauticMigration;

final class Version20251201120000 extends AbstractMauticMigration
{
    public function preUp(Schema $schema): void
    {
        $tableName = $this->prefix.'lead_field_groups';

        if (!$schema->hasTable($tableName)) {
            return;
        }

        $count = $this->connection->fetchOne("SELECT COUNT(*) FROM {$tableName}");

        if ($count > 0) {
            $this->skipIf(true, 'Field groups already exist');
        }
    }

    public function up(Schema $schema): void
    {
        $tableName = $this->prefix.'lead_field_groups';

        $this->addSql("
            CREATE TABLE IF NOT EXISTS {$tableName} (
                id INT UNSIGNED AUTO_INCREMENT NOT NULL,
                name VARCHAR(191) NOT NULL,
                description LONGTEXT DEFAULT NULL,
                alias VARCHAR(50) NOT NULL,
                is_system TINYINT(1) DEFAULT 0 NOT NULL,
                is_published TINYINT(1) DEFAULT 1 NOT NULL,
                date_added DATETIME DEFAULT NULL,
                date_modified DATETIME DEFAULT NULL,
                checked_out DATETIME DEFAULT NULL,
                checked_out_by INT DEFAULT NULL,
                checked_out_by_user VARCHAR(191) DEFAULT NULL,
                created_by INT DEFAULT NULL,
                created_by_user VARCHAR(191) DEFAULT NULL,
                modified_by INT DEFAULT NULL,
                modified_by_user VARCHAR(191) DEFAULT NULL,
                PRIMARY KEY(id),
                UNIQUE INDEX lead_field_group_alias (alias)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB
        ");

        $this->addSql("INSERT IGNORE INTO {$tableName} (name, alias, is_system, is_published) VALUES ('Core', 'core', 1, 1)");
        $this->addSql("INSERT IGNORE INTO {$tableName} (name, alias, is_system, is_published) VALUES ('Social', 'social', 1, 1)");
        $this->addSql("INSERT IGNORE INTO {$tableName} (name, alias, is_system, is_published) VALUES ('Personal', 'personal', 1, 1)");
        $this->addSql("INSERT IGNORE INTO {$tableName} (name, alias, is_system, is_published) VALUES ('Professional', 'professional', 1, 1)");
    }

    public function down(Schema $schema): void
    {
        $tableName = $this->prefix.'lead_field_groups';

        $this->addSql("DROP TABLE IF EXISTS {$tableName}");
    }
}

<?php

use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;

return function (ContainerConfigurator $configurator) {
    $configurator->extension('doctrine', [
        'dbal' => [
            'connections' => [
                'default' => [
                    'host'     => 'db',
                    'port'     => '3306',
                    'dbname'   => 'test',
                    'user'     => 'db',
                    'password' => 'db',
                    'driver'   => 'pdo_mysql',
                    'charset'  => 'utf8mb4',
                    'default_table_options' => [
                        'charset' => 'utf8mb4',
                        'collate' => 'utf8mb4_unicode_ci',
                    ],
                ],
            ],
        ],
    ]);
};

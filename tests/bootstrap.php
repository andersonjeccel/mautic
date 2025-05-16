<?php

use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__).'/vendor/autoload.php';

// Load environment variables from .env.test if it exists
if (file_exists(dirname(__DIR__).'/.env.test')) {
    (new Dotenv())->load(dirname(__DIR__).'/.env.test');
}

// Set test environment variables
putenv('APP_ENV=test');
putenv('APP_DEBUG=1');
putenv('MAUTIC_TABLE_PREFIX=');
putenv('MAUTIC_DB_HOST=db');
putenv('MAUTIC_DB_PORT=3306');
putenv('MAUTIC_DB_NAME=db');
putenv('MAUTIC_DB_USER=db');
putenv('MAUTIC_DB_PASSWORD=db');
putenv('MAUTIC_DB_TABLE_PREFIX=');
putenv('MAUTIC_DB_DRIVER=pdo_mysql');

// Set the environment for the test kernel
$_ENV['APP_ENV'] = 'test';
$_ENV['APP_DEBUG'] = '1';
$_ENV['MAUTIC_TABLE_PREFIX'] = '';
$_ENV['MAUTIC_DB_HOST'] = 'db';
$_ENV['MAUTIC_DB_PORT'] = '3306';
$_ENV['MAUTIC_DB_NAME'] = 'db';
$_ENV['MAUTIC_DB_USER'] = 'db';
$_ENV['MAUTIC_DB_PASSWORD'] = 'db';
$_ENV['MAUTIC_DB_TABLE_PREFIX'] = '';
$_ENV['MAUTIC_DB_DRIVER'] = 'pdo_mysql';

// Ensure the test environment is set
$_SERVER['APP_ENV'] = $_ENV['APP_ENV'] = 'test';
$_SERVER['APP_DEBUG'] = $_ENV['APP_DEBUG'] = '1';

// Create test cache and log directories if they don't exist
$testCacheDir = sys_get_temp_dir().'/mautic_test/cache';
$testLogDir = sys_get_temp_dir().'/mautic_test/logs';

if (!file_exists($testCacheDir)) {
    mkdir($testCacheDir, 0777, true);
}

if (!file_exists($testLogDir)) {
    mkdir($testLogDir, 0777, true);
}

// Set the test cache and log directories
putenv("TEST_CACHE_DIR=$testCacheDir");
putenv("TEST_LOG_DIR=$testLogDir");

// Clear the cache
$files = new \Symfony\Component\Finder\Finder();
$files->in($testCacheDir)->ignoreDotFiles(false);
$files = iterator_to_array($files);

foreach ($files as $file) {
    if (is_dir($file)) {
        rmdir($file);
    } else {
        unlink($file);
    }
}

// Load test configuration
if (file_exists(__DIR__.'/../app/config/test/mautic_test.php')) {
    $loader = require __DIR__.'/../app/autoload.php';
    $kernel = new AppKernel('test', true);
    $kernel->boot();
    $container = $kernel->getContainer();
    $container->get('doctrine')->getConnection()->connect();
}

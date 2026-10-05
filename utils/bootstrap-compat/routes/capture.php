<?php

/**
 * Capture an authenticated Mautic route using the test browser.
 *
 * Usage: php utils/bootstrap-compat/routes/capture.php /s/dashboard output.html
 */

if ('cli' !== PHP_SAPI) {
    http_response_code(403);
    exit;
}

$route      = $argv[1] ?? '/s/dashboard';
$outputPath = $argv[2] ?? '/var/www/html/var/cache/bootstrap-route.html';

define('IS_PHPUNIT', true);
include '/var/www/html/config/local.php';

foreach (['DB_HOST' => 'db_host', 'DB_PORT' => 'db_port', 'DB_NAME' => 'db_name', 'DB_USER' => 'db_user', 'DB_PASSWD' => 'db_password'] as $env => $key) {
    $value = $parameters[$key] ?? null;
    if (null !== $value) {
        putenv($env.'='.$value);
        $_ENV[$env]    = (string) $value;
        $_SERVER[$env] = (string) $value;
    }
}

require '/var/www/html/app/config/bootstrap.php';

@mkdir('/var/www/html/var/cache/test/htmlpurifier', 0775, true);

$kernel = new AppKernel('test', true);
$kernel->boot();
$container = $kernel->getContainer()->get('test.service_container');
$user      = $container->get('doctrine')->getManager()->getRepository(Mautic\UserBundle\Entity\User::class)->findOneBy(['username' => 'admin']);

if (!$user) {
    fwrite(STDERR, "Admin user not found.\n");
    exit(2);
}

$client = new Symfony\Bundle\FrameworkBundle\KernelBrowser($kernel);
$client->setServerParameter('HTTPS', 'on');
$client->setServerParameter('HTTP_HOST', 'ddev-mautic-bootstrap-compat-7x-web');
$client->followRedirects(true);
$client->loginUser($user, 'mautic');
$client->request('GET', $route);

$response = $client->getResponse();
if (200 !== $response->getStatusCode()) {
    fwrite(STDERR, sprintf("Route %s returned HTTP %d.\n", $route, $response->getStatusCode()));
    exit(3);
}

$content = $response->getContent();
if (false === $content || '' === $content) {
    fwrite(STDERR, "Route returned an empty response.\n");
    exit(4);
}

@mkdir(dirname($outputPath), 0775, true);
if (false === file_put_contents($outputPath, $content)) {
    fwrite(STDERR, sprintf("Could not write %s.\n", $outputPath));
    exit(5);
}

printf("Captured %s: HTTP 200, %d bytes, %s\n", $route, strlen($content), $outputPath);

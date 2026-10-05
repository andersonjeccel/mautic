<?php

declare(strict_types=1);

require dirname(__DIR__, 3).'/vendor/autoload.php';

$_ENV['MAUTIC_TABLE_PREFIX']    ??= '';
$_SERVER['MAUTIC_TABLE_PREFIX'] ??= '';

$kernel = new AppKernel('dev', true);
$kernel->boot();

/** @var Doctrine\DBAL\Connection $connection */
$connection = $kernel->getContainer()->get('doctrine')->getConnection();
$admin      = $connection->fetchAssociative("SELECT id, username FROM users WHERE username = 'admin' LIMIT 1");

if (!$admin) {
    throw new RuntimeException('The Bootstrap showcase requires the existing admin user.');
}

$uuid = static function (): string {
    $bytes    = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex      = bin2hex($bytes);

    return sprintf('%s-%s-%s-%s-%s', substr($hex, 0, 8), substr($hex, 8, 4), substr($hex, 12, 4), substr($hex, 16, 4), substr($hex, 20));
};

$ensure = static function (string $table, string $key, string $value, array $data) use ($connection): int {
    $existing = $connection->fetchOne(sprintf('SELECT id FROM %s WHERE %s = ? LIMIT 1', $table, $key), [$value]);
    if ($existing) {
        return (int) $existing;
    }

    $connection->insert($table, [$key => $value] + $data);

    return (int) $connection->lastInsertId();
};

$base = [
    'is_published'    => 1,
    'date_added'      => (new DateTimeImmutable())->format('Y-m-d H:i:s'),
    'created_by'      => (int) $admin['id'],
    'created_by_user' => (string) $admin['username'],
];

$formId = (int) $connection->fetchOne('SELECT id FROM forms ORDER BY id LIMIT 1');

$focusProperties = [
    'bar' => ['allow_hide' => 1, 'push_page' => 1, 'sticky' => 1, 'size' => 'large', 'placement' => 'top'],
    'modal' => ['placement' => 'top'],
    'notification' => ['placement' => 'top_left'],
    'page' => [],
    'animate' => 1,
    'link_activation' => 1,
    'colors' => ['primary' => '4e5d9d', 'text' => '000000', 'button' => 'fdb933', 'button_text' => 'ffffff'],
    'content' => [
        'headline' => 'Bootstrap 5 showcase',
        'tagline' => 'Focus builder visual coverage',
        'link_text' => 'Open Mautic',
        'link_url' => 'https://www.mautic.org',
        'link_new_window' => 1,
        'font' => 'Arial, Helvetica, sans-serif',
        'css' => null,
    ],
    'when' => 'immediately',
    'timeout' => null,
    'frequency' => 'everypage',
    'stop_after_conversion' => 1,
];

$ensure('focus', 'name', 'Bootstrap Showcase – Modal Focus', $base + [
    'description' => 'Modal focus item for Bootstrap migration coverage.',
    'focus_type'  => 'link',
    'style'       => 'modal',
    'website'     => '1',
    'properties'  => serialize($focusProperties),
    'utm_tags'    => serialize([]),
    'html_mode'   => 'basic',
    'uuid'        => $uuid(),
]);

if ($formId > 0) {
    $formProperties = $focusProperties;
    $formProperties['content']['headline'] = 'Bootstrap Showcase Form';
    $formProperties['content']['tagline']  = 'Form focus item coverage';
    $ensure('focus', 'name', 'Bootstrap Showcase – Form Bar', $base + [
        'description' => 'Form bar focus item for Bootstrap migration coverage.',
        'focus_type'  => 'form',
        'style'       => 'bar',
        'website'     => '1',
        'properties'  => serialize($formProperties),
        'utm_tags'    => serialize([]),
        'form_id'     => $formId,
        'html_mode'   => 'basic',
        'uuid'        => $uuid(),
    ]);
}

$ensure('dynamic_content', 'name', 'Bootstrap Showcase Dynamic Content', $base + [
    'description'       => 'Dynamic content details and editor coverage.',
    'type'              => 'html',
    'sent_count'        => 0,
    'content'           => '<section><h2>Bootstrap 5 showcase</h2><p>Dynamic content preview.</p><a class="btn btn-primary">Action</a></section>',
    'utm_tags'          => '{}',
    'lang'              => 'en',
    'variant_settings'  => serialize([]),
    'filters'           => serialize([]),
    'is_campaign_based' => 0,
    'slot_name'         => 'bootstrap-showcase',
    'uuid'              => $uuid(),
]);

$ensure('webhooks', 'name', 'Bootstrap Showcase Webhook', $base + [
    'description'  => 'Webhook details coverage.',
    'webhook_url'  => 'https://example.invalid/mautic-showcase',
    'secret'       => bin2hex(random_bytes(16)),
]);

$pointGroupId = $ensure('point_groups', 'name', 'Bootstrap Showcase Group', $base + [
    'description' => 'Point group UI coverage.',
    'uuid'        => $uuid(),
]);

$ensure('points', 'name', 'Bootstrap Showcase Point Action', $base + [
    'group_id'    => $pointGroupId,
    'description' => 'Point action details coverage.',
    'type'        => 'page.hit',
    'repeatable'  => 1,
    'delta'       => 10,
    'properties'  => serialize(['page_url' => 'https://example.invalid/showcase']),
    'uuid'        => $uuid(),
]);

$triggerId = $ensure('point_triggers', 'name', 'Bootstrap Showcase Trigger', $base + [
    'group_id'               => $pointGroupId,
    'description'            => 'Point trigger builder coverage.',
    'points'                 => 10,
    'color'                  => '4e5d9d',
    'trigger_existing_leads' => 1,
    'uuid'                   => $uuid(),
]);

$ensure('point_trigger_events', 'name', 'Bootstrap Showcase Trigger Event', [
    'trigger_id'   => $triggerId,
    'description'  => 'Trigger event panel coverage.',
    'type'         => 'email.send',
    'action_order' => 1,
    'properties'   => serialize([]),
    'uuid'         => $uuid(),
]);

$ensure('stages', 'name', 'Bootstrap Showcase Stage', $base + [
    'description' => 'Stage details coverage.',
    'weight'      => 10,
    'uuid'        => $uuid(),
]);

$ensure('notifications', 'header', 'Bootstrap Showcase Notification', [
    'user_id'    => (int) $admin['id'],
    'type'       => 'info',
    'message'    => 'Notification dropdown and list visual coverage.',
    'date_added' => (new DateTimeImmutable())->format('Y-m-d H:i:s'),
    'icon_class' => 'ri-information-line',
    'is_read'    => 0,
]);

$messageId = $ensure('messages', 'name', 'Bootstrap Showcase Marketing Message', $base + [
    'description' => 'Marketing message editor and details coverage.',
    'uuid'        => $uuid(),
]);

$ensure('message_channels', 'message_id', (string) $messageId, [
    'channel'    => 'email',
    'channel_id' => (int) $connection->fetchOne('SELECT id FROM emails ORDER BY id LIMIT 1'),
    'properties' => '{}',
    'is_enabled' => 1,
    'uuid'       => $uuid(),
]);

$ensure('push_notifications', 'name', 'Bootstrap Showcase Mobile Notification', $base + [
    'description'       => 'Mobile notification editor and details coverage.',
    'url'               => 'https://www.mautic.org',
    'heading'           => 'Bootstrap 5 showcase',
    'message'           => 'Mobile notification visual coverage.',
    'button'            => 'Open',
    'utm_tags'          => serialize([]),
    'notification_type' => 'web',
    'read_count'        => 0,
    'sent_count'        => 0,
    'mobile'            => 1,
    'mobileSettings'    => serialize([]),
    'uuid'              => $uuid(),
    'lang'              => 'en',
]);

$ensure('projects', 'name', 'Bootstrap Showcase Project', $base + [
    'description' => 'Project list and details coverage.',
    'properties'  => '{}',
    'uuid'        => $uuid(),
]);

$ensure('lead_tags', 'tag', 'bootstrap-showcase', [
    'description' => 'Tag details coverage.',
    'uuid'        => $uuid(),
]);

$tables = [
    'focus', 'dynamic_content', 'webhooks', 'point_groups', 'points',
    'point_triggers', 'point_trigger_events', 'stages', 'notifications',
    'messages', 'push_notifications', 'projects', 'lead_tags',
];
$counts = [];
foreach ($tables as $table) {
    $counts[$table] = (int) $connection->fetchOne(sprintf('SELECT COUNT(*) FROM %s', $table));
}

echo json_encode($counts, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR).PHP_EOL;

$kernel->shutdown();

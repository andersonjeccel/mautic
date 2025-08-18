<?php

declare(strict_types=1);

$ignoreErrors   = [];
$ignoreErrors[] = [
    'message'    => '#^Property MauticPlugin\\\\MailgunWebhookSupportBundle\\\\Callback\\\\ResponseItem\\:\\:\\$channel \\(int\\|null\\) is never assigned int so it can be removed from the property type\\.$#',
    'identifier' => 'property.unusedType',
    'count'      => 1,
    'path'       => __DIR__.'/Callback/ResponseItem.php',
];

return ['parameters' => ['ignoreErrors' => $ignoreErrors]];

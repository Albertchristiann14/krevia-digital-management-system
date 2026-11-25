<?php

// Prepare writable temporary directories for Vercel's read-only filesystem.
$tmpStorage = '/tmp/storage';
foreach ([
    $tmpStorage.'/app/private',
    $tmpStorage.'/app/public',
    $tmpStorage.'/framework/cache/data',
    $tmpStorage.'/framework/sessions',
    $tmpStorage.'/framework/testing',
    $tmpStorage.'/framework/views',
    $tmpStorage.'/logs',
    '/tmp/bootstrap/cache',
] as $dir) {
    if (! is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

require __DIR__.'/../public/index.php';

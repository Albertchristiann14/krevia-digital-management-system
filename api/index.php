<?php

declare(strict_types=1);

// 1. Explicitly identify Vercel Serverless environment
putenv('VERCEL=1');
$_ENV['VERCEL'] = '1';
$_SERVER['VERCEL'] = '1';

// 2. Prepare writable temporary storage directories in /tmp
$tmpStorage = '/tmp/storage';
$requiredDirs = [
    $tmpStorage.'/app/private',
    $tmpStorage.'/app/public',
    $tmpStorage.'/framework/cache/data',
    $tmpStorage.'/framework/sessions',
    $tmpStorage.'/framework/testing',
    $tmpStorage.'/framework/views',
    $tmpStorage.'/logs',
    '/tmp/bootstrap/cache',
];

foreach ($requiredDirs as $dir) {
    if (! is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
}

// 3. Pre-seed bootstrap cache from build artifacts if available
$baseBootstrapCache = dirname(__DIR__).'/bootstrap/cache';
if (is_dir($baseBootstrapCache)) {
    foreach (['packages.php', 'services.php'] as $cacheFile) {
        $source = $baseBootstrapCache.'/'.$cacheFile;
        $target = '/tmp/bootstrap/cache/'.$cacheFile;
        if (file_exists($source) && ! file_exists($target)) {
            @copy($source, $target);
        }
    }
}

// 4. Ensure Blade views compile to writable /tmp
putenv('VIEW_COMPILED_PATH='.$tmpStorage.'/framework/views');
$_ENV['VIEW_COMPILED_PATH'] = $tmpStorage.'/framework/views';
$_SERVER['VIEW_COMPILED_PATH'] = $tmpStorage.'/framework/views';

// 5. Execute application with robust diagnostic logging
try {
    require __DIR__.'/../public/index.php';
} catch (\Throwable $e) {
    $errorMsg = sprintf(
        '[KDMS Vercel Boot Exception] %s: %s in %s:%d',
        get_class($e),
        $e->getMessage(),
        $e->getFile(),
        $e->getLine()
    );
    error_log($errorMsg);
    error_log("[KDMS Vercel Trace]\n".$e->getTraceAsString());

    if ($prev = $e->getPrevious()) {
        $prevMsg = sprintf(
            '[KDMS Vercel Root Exception] %s: %s in %s:%d',
            get_class($prev),
            $prev->getMessage(),
            $prev->getFile(),
            $prev->getLine()
        );
        error_log($prevMsg);
        error_log("[KDMS Vercel Root Trace]\n".$prev->getTraceAsString());
    }

    if (! headers_sent()) {
        http_response_code(500);
        header('Content-Type: text/html; charset=utf-8');
    }

    $debug = filter_var(getenv('APP_DEBUG') ?: ($_ENV['APP_DEBUG'] ?? false), FILTER_VALIDATE_BOOLEAN);

    if ($debug) {
        echo '<!DOCTYPE html><html><head><title>KDMS · Boot Error</title>';
        echo '<style>body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#0f172a;color:#f8fafc;padding:32px;line-height:1.5;}pre{background:#1e293b;padding:16px;border-radius:8px;overflow:auto;font-size:13px;border:1px solid #334155;}</style></head><body>';
        echo '<h2 style="color:#ef4444;margin-top:0;">KDMS Serverless Boot Exception</h2>';
        echo '<p><strong>'.htmlspecialchars(get_class($e)).':</strong> '.htmlspecialchars($e->getMessage()).'</p>';
        echo '<p>File: <code>'.htmlspecialchars($e->getFile()).':'.$e->getLine().'</code></p>';
        echo '<pre>'.htmlspecialchars($e->getTraceAsString()).'</pre>';

        if ($prev = $e->getPrevious()) {
            echo '<h3 style="color:#f59e0b;">Previous / Root Cause: '.htmlspecialchars(get_class($prev)).'</h3>';
            echo '<p>'.htmlspecialchars($prev->getMessage()).'</p>';
            echo '<pre>'.htmlspecialchars($prev->getTraceAsString()).'</pre>';
        }

        echo '</body></html>';
    } else {
        echo '<!DOCTYPE html><html><head><title>System Error · KDMS</title>';
        echo '<style>body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}div{max-width:480px;text-align:center;padding:24px;}h1{font-size:24px;margin-bottom:8px;}p{color:#94a3b8;font-size:14px;line-height:1.6;}</style></head><body>';
        echo '<div><h1>500 · Server Boot Error</h1><p>Krevia Digital Management System encountered an issue during startup. Please ensure Supabase database credentials, APP_KEY, and Vercel Environment Variables are correctly configured.</p></div></body></html>';
    }

    exit(1);
}

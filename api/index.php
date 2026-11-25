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

// 3. Pre-seed bootstrap cache from build bundle with class existence guard
$vendorAutoload = dirname(__DIR__).'/vendor/autoload.php';
if (file_exists($vendorAutoload)) {
    require_once $vendorAutoload;
}

$baseBootstrapCache = dirname(__DIR__).'/bootstrap/cache';
if (is_dir($baseBootstrapCache)) {
    $source = $baseBootstrapCache.'/packages.php';
    $target = '/tmp/bootstrap/cache/packages.php';
    if (file_exists($source) && ! file_exists($target)) {
        $pkgs = @include $source;
        if (is_array($pkgs)) {
            foreach ($pkgs as $k => &$meta) {
                if (isset($meta['providers']) && is_array($meta['providers'])) {
                    $meta['providers'] = array_values(array_filter($meta['providers'], fn ($p) => class_exists($p)));
                    if (empty($meta['providers'])) {
                        unset($pkgs[$k]);
                    }
                }
            }
            unset($meta);
            @file_put_contents($target, '<?php return '.var_export($pkgs, true).';');
        } else {
            @copy($source, $target);
        }
    }
}

// 4. Force Laravel bootstrap & compilation to use writable /tmp
$cacheOverrides = [
    'APP_PACKAGES_CACHE' => '/tmp/bootstrap/cache/packages.php',
    'APP_SERVICES_CACHE' => '/tmp/bootstrap/cache/services.php',
    'APP_CONFIG_CACHE' => '/tmp/bootstrap/cache/config.php',
    'APP_ROUTES_CACHE' => '/tmp/bootstrap/cache/routes-v7.php',
    'APP_EVENTS_CACHE' => '/tmp/bootstrap/cache/events.php',
    'VIEW_COMPILED_PATH' => $tmpStorage.'/framework/views',
];

foreach ($cacheOverrides as $key => $val) {
    putenv("{$key}={$val}");
    $_ENV[$key] = $val;
    $_SERVER[$key] = $val;
}

// 5. Safe Diagnostic Logging to stderr
$hasAppKey = ! empty(getenv('APP_KEY') ?: ($_ENV['APP_KEY'] ?? ''));
$dbConnection = getenv('DB_CONNECTION') ?: ($_ENV['DB_CONNECTION'] ?? 'unset');
$dbHost = getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? '');
$dbPort = getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? '');
$dbDatabase = getenv('DB_DATABASE') ?: ($_ENV['DB_DATABASE'] ?? '');
$dbUsername = getenv('DB_USERNAME') ?: ($_ENV['DB_USERNAME'] ?? '');
$dbPassword = getenv('DB_PASSWORD') ?: ($_ENV['DB_PASSWORD'] ?? '');

$relevantExts = ['pdo', 'pdo_pgsql', 'pgsql', 'pdo_mysql', 'mbstring', 'openssl', 'tokenizer', 'xml', 'ctype', 'json'];
$extStatus = [];
foreach ($relevantExts as $ext) {
    $extStatus[$ext] = extension_loaded($ext);
}

error_log(sprintf(
    '[KDMS Diagnostic] PHP %s | APP_KEY: %s | DB_CONN: %s | DB_VARS: [host=%s, port=%s, db=%s, user=%s, pass=%s] | EXT: %s',
    PHP_VERSION,
    $hasAppKey ? 'OK' : 'MISSING',
    $dbConnection,
    ! empty($dbHost) ? 'yes' : 'no',
    ! empty($dbPort) ? 'yes' : 'no',
    ! empty($dbDatabase) ? 'yes' : 'no',
    ! empty($dbUsername) ? 'yes' : 'no',
    ! empty($dbPassword) ? 'yes' : 'no',
    json_encode($extStatus)
));

// 6. Safe Diagnostic Probe Endpoint (Accessible via /_diag or ?kdms_diag=1)
$uri = $_SERVER['REQUEST_URI'] ?? '/';
if (str_starts_with($uri, '/_diag') || isset($_GET['kdms_diag'])) {
    header('Content-Type: application/json; charset=utf-8');
    
    // Test database connection safely
    $dbTest = ['connected' => false, 'error' => null];
    if ($dbConnection === 'pgsql' && extension_loaded('pdo_pgsql') && ! empty($dbHost)) {
        try {
            $dsn = sprintf(
                'pgsql:host=%s;port=%s;dbname=%s;sslmode=%s',
                $dbHost,
                $dbPort ?: '5432',
                $dbDatabase ?: 'postgres',
                getenv('DB_SSLMODE') ?: ($_ENV['DB_SSLMODE'] ?? 'require')
            );
            $pdo = new PDO($dsn, $dbUsername, $dbPassword, [
                PDO::ATTR_TIMEOUT => 4,
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ]);
            $dbTest['connected'] = true;
            $dbTest['server_version'] = $pdo->getAttribute(PDO::ATTR_SERVER_VERSION);
        } catch (\Throwable $e) {
            $dbTest['error'] = preg_replace('/:[^:@\/]+@/', ':***@', $e->getMessage());
        }
    }

    echo json_encode([
        'status' => 'KDMS Serverless Diagnostic',
        'php_version' => PHP_VERSION,
        'app_key_present' => $hasAppKey,
        'db_connection' => $dbConnection,
        'db_host_present' => ! empty($dbHost),
        'db_username_present' => ! empty($dbUsername),
        'db_password_present' => ! empty($dbPassword),
        'database_test' => $dbTest,
        'extensions' => $extStatus,
        'storage_writable' => is_writable($tmpStorage),
        'cache_writable' => is_writable('/tmp/bootstrap/cache'),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit(0);
}

// 7. Execute Application with Root-Cause Diagnostics
try {
    error_log('[KDMS Boot Stage] Requiring public/index.php...');
    require __DIR__.'/../public/index.php';
} catch (\Throwable $e) {
    // Find the original / deepest root cause
    $rootException = $e;
    while ($rootException->getPrevious() !== null) {
        $rootException = $rootException->getPrevious();
    }

    $sanitizedMsg = preg_replace('/password=([^\s;]+)/i', 'password=***', $rootException->getMessage());
    $sanitizedMsg = preg_replace('/:[^:@\/]+@/', ':***@', $sanitizedMsg);

    error_log(sprintf(
        '[KDMS Vercel Root Exception] %s: %s in %s:%d',
        get_class($rootException),
        $sanitizedMsg,
        $rootException->getFile(),
        $rootException->getLine()
    ));
    error_log("[KDMS Vercel Root Trace]\n".$rootException->getTraceAsString());

    if (! headers_sent()) {
        http_response_code(500);
        header('Content-Type: text/html; charset=utf-8');
    }

    // Render diagnostic error screen (Sanitized - NEVER exposes secret values)
    $diagHtml = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>KDMS · Serverless Boot Error</title>';
    $diagHtml .= '<style>';
    $diagHtml .= 'body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#f8fafc;margin:0;padding:32px 16px;display:flex;justify-content:center;}';
    $diagHtml .= '.container{max-width:680px;width:100%;}';
    $diagHtml .= '.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;box-shadow:0 10px 25px rgba(0,0,0,0.3);}';
    $diagHtml .= 'h1{font-size:20px;color:#ef4444;margin:0 0 8px 0;display:flex;align-items:center;gap:8px;}';
    $diagHtml .= 'p{color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 16px 0;}';
    $diagHtml .= '.alert{background:#450a0a;border:1px solid #991b1b;color:#fca5a5;padding:12px 16px;border-radius:8px;font-family:ui-monospace,monospace;font-size:12px;margin-bottom:16px;word-break:break-all;}';
    $diagHtml .= '.table{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px;}';
    $diagHtml .= '.table th{text-align:left;color:#64748b;padding:6px 8px;border-bottom:1px solid #334155;font-weight:600;}';
    $diagHtml .= '.table td{padding:6px 8px;border-bottom:1px solid #334155;color:#cbd5e1;}';
    $diagHtml .= '.badge-ok{color:#34d399;font-weight:bold;}';
    $diagHtml .= '.badge-err{color:#f87171;font-weight:bold;}';
    $diagHtml .= '.footer{margin-top:20px;font-size:11px;color:#64748b;text-align:center;}';
    $diagHtml .= '</style></head><body>';
    $diagHtml .= '<div class="container"><div class="card">';
    $diagHtml .= '<h1>500 · Server Boot Error</h1>';
    $diagHtml .= '<p>Krevia Digital Management System encountered an issue during startup. The sanitized root exception details and system diagnostics are displayed below:</p>';
    $diagHtml .= '<div class="alert">';
    $diagHtml .= '<strong>'.htmlspecialchars(get_class($rootException)).':</strong><br>';
    $diagHtml .= htmlspecialchars($sanitizedMsg).'<br><br>';
    $diagHtml .= '<span style="color:#f87171;font-size:11px;">Location: '.htmlspecialchars(basename($rootException->getFile())).':'.$rootException->getLine().'</span>';
    $diagHtml .= '</div>';
    
    $diagHtml .= '<h3 style="font-size:14px;color:#f1f5f9;margin:16px 0 8px 0;">Environment Diagnostics</h3>';
    $diagHtml .= '<table class="table">';
    $diagHtml .= '<tr><th>Parameter</th><th>Value / Status</th></tr>';
    $diagHtml .= '<tr><td>PHP Version</td><td>'.htmlspecialchars(PHP_VERSION).'</td></tr>';
    $diagHtml .= '<tr><td>pdo_pgsql Extension</td><td>'.(extension_loaded('pdo_pgsql') ? '<span class="badge-ok">Installed</span>' : '<span class="badge-err">Missing</span>').'</td></tr>';
    $diagHtml .= '<tr><td>APP_KEY Present</td><td>'.($hasAppKey ? '<span class="badge-ok">Yes</span>' : '<span class="badge-err">No (Missing)</span>').'</td></tr>';
    $diagHtml .= '<tr><td>DB_CONNECTION</td><td>'.htmlspecialchars($dbConnection).'</td></tr>';
    $diagHtml .= '<tr><td>DB_HOST Configured</td><td>'.(!empty($dbHost) ? '<span class="badge-ok">Yes</span>' : '<span class="badge-err">No</span>').'</td></tr>';
    $diagHtml .= '<tr><td>DB_PASSWORD Configured</td><td>'.(!empty($dbPassword) ? '<span class="badge-ok">Yes</span>' : '<span class="badge-err">No</span>').'</td></tr>';
    $diagHtml .= '</table>';
    
    $diagHtml .= '<div class="footer">For live diagnostic JSON probe, visit <code>/_diag</code>. Check Vercel Function Logs for full stack trace.</div>';
    $diagHtml .= '</div></div></body></html>';

    echo $diagHtml;
    exit(1);
}

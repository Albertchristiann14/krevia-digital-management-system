<?php

use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

$isVercel = isset($_SERVER['VERCEL'])
    || isset($_ENV['VERCEL'])
    || getenv('VERCEL')
    || isset($_SERVER['LAMBDA_TASK_ROOT'])
    || (is_dir('/tmp') && ! is_writable(dirname(__DIR__).'/storage'));

$app = Application::configure(basePath: dirname(__DIR__))
    ->registered(function ($app) use ($isVercel): void {
        if ($isVercel) {
            $app->useStoragePath('/tmp/storage');
        }
    })
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(
        __DIR__.'/../routes/channels.php',
        ['middleware' => ['web', 'auth', 'active.user']],
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->web(append: [
            HandleInertiaRequests::class,
            SecurityHeaders::class,
        ]);

        $middleware->alias([
            'active.user' => EnsureUserIsActive::class,
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Throwable $e, Request $request) {
            $sanitized = preg_replace('/password=([^\s;]+)/i', 'password=***', $e->getMessage());
            $sanitized = preg_replace('/:[^:@\/]+@/', ':***@', $sanitized);

            error_log(sprintf(
                '[KDMS Request Exception] %s: %s in %s:%d',
                get_class($e),
                $sanitized,
                $e->getFile(),
                $e->getLine()
            ));

            if ($request->header('X-KDMS-Diag') === '1' || $request->has('diag')) {
                return response()->json([
                    'status' => 'error',
                    'exception' => get_class($e),
                    'message' => $sanitized,
                    'file' => basename($e->getFile()).':'.$e->getLine(),
                ], 500);
            }
        });

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();

if ($isVercel) {
    $app->useStoragePath('/tmp/storage');
}

return $app;

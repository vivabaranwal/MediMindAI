<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'verified.mobile' => \App\Http\Middleware\EnsureVerifiedMobile::class,
            'audit' => \App\Http\Middleware\AuditLogMiddleware::class,
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);

        // The web app signs in with a first-party session cookie (see LoginController); API clients keep bearer tokens.
        $middleware->statefulApi();

        // The API sits behind the web app's proxy / a load balancer on a private network.
        $middleware->trustProxies(at: env('TRUSTED_PROXIES') === '*' ? '*' : (env('TRUSTED_PROXIES') ? explode(',', env('TRUSTED_PROXIES')) : null));

        $middleware->appendToGroup('api', \App\Http\Middleware\AuditLogMiddleware::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();

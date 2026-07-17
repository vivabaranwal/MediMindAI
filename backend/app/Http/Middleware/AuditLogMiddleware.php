<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class AuditLogMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only log write/modifying requests for authenticated users
        if (Auth::check() && in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            $user = Auth::user();
            
            // Exclude logout from resource modification logging
            if ($request->is('api/auth/logout')) {
                return $response;
            }

            $path = $request->path();
            $method = $request->method();
            $action = "{$method} {$path}";

            // Try to guess resource type and ID
            $resourceType = null;
            $resourceId = null;
            
            $route = $request->route();
            if ($route) {
                $controller = class_basename($route->getControllerClass() ?? '');
                $resourceType = str_replace('Controller', '', $controller);

                $params = $route->parameters();
                if (!empty($params)) {
                    $resourceId = reset($params);
                    if (is_object($resourceId) && method_exists($resourceId, 'getKey')) {
                        $resourceId = $resourceId->getKey();
                    } elseif (is_array($resourceId)) {
                        $resourceId = $resourceId['id'] ?? null;
                    }
                }
            }

            // Exclude sensitive inputs
            $newValues = $request->except(['password', 'password_confirmation', 'otp', 'token']);

            AuditLog::create([
                'user_id' => $user->id,
                'action' => $action,
                'resource_type' => $resourceType,
                'resource_id' => is_numeric($resourceId) ? (int)$resourceId : null,
                'old_values' => null,
                'new_values' => empty($newValues) ? $newValues : null,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        }

        return $response;
    }
}

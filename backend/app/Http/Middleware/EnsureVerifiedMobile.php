<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureVerifiedMobile
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && !$request->user()->mobile_verified_at) {
            return response()->json([
                'success' => false,
                'message' => 'Your mobile number is not verified.',
            ], 403);
        }

        return $next($request);
    }
}

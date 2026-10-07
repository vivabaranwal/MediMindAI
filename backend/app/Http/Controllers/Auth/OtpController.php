<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class OtpController extends Controller
{
    public function __construct(protected OtpService $otpService)
    {
    }

    /**
     * Send an OTP to a mobile number.
     *
     * POST /api/auth/send-otp
     *
     * The response is identical whether or not the number belongs to a user,
     * so this endpoint cannot be used to enumerate registered mobiles.
     */
    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'mobile' => ['required', 'string', 'max:20'],
        ]);

        try {
            $this->otpService->sendOtp($request->input('mobile'));
        } catch (RuntimeException $e) {
            Log::warning('[otp] send failed', ['reason' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to send a code right now. Please try again shortly.',
            ], 429);
        }

        return response()->json([
            'success' => true,
            'message' => 'If the number is registered, a code has been sent.',
        ]);
    }
}

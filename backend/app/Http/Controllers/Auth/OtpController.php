<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OtpController extends Controller
{
    protected OtpService $otpService;

    public function __construct(OtpService $otpService)
    {
        $this->otpService = $otpService;
    }

    /**
     * Send OTP to a mobile number.
     *
     * POST /api/auth/send-otp
     */
    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'mobile' => ['required', 'string'],
        ]);

        $mobile = $request->input('mobile');

        try {
            $otp = $this->otpService->sendOtp($mobile);

            return response()->json([
                'success' => true,
                'message' => 'OTP sent successfully.',
                // For development ease, we expose it; in production it would be hidden
                'otp' => app()->environment('production') ? null : $otp,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to send OTP. ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Verify OTP for a mobile number.
     *
     * POST /api/auth/verify-otp
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'mobile' => ['required', 'string'],
            'otp' => ['required', 'string', 'size:6'],
        ]);

        $mobile = $request->input('mobile');
        $otp = $request->input('otp');

        $isValid = $this->otpService->verifyOtp($mobile, $otp);

        if ($isValid) {
            return response()->json([
                'success' => true,
                'message' => 'OTP verified successfully.',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Invalid or expired OTP.',
        ], 422);
    }
}

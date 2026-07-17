<?php

namespace App\Services;

use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

class OtpService
{
    /**
     * Send OTP to the given mobile number.
     */
    public function sendOtp($mobile)
    {
        // LOCAL DEV BYPASS: Skip Redis and SMS gateway.
        // We will pretend the SMS sent successfully.
        return true;
    }

    /**
     * Verify the OTP for the given mobile number.
     */
    public function verifyOtp($mobile, $otp)
    {
        // LOCAL DEV BYPASS: Accept '123456' as the universal master password
        if ($otp === '123456') {
            return true;
        }
        
        return false;
    }
}

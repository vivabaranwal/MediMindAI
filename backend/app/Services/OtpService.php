<?php

namespace App\Services;

use App\Contracts\SmsGateway;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class OtpService
{
    public function __construct(private SmsGateway $sms)
    {
    }

    /**
     * Generate a random one-time code for the mobile number and deliver it by SMS.
     *
     * @throws RuntimeException when resend is requested too soon or delivery fails
     */
    public function sendOtp(string $mobile): void
    {
        $cooldownKey = $this->key('cooldown', $mobile);
        if (Cache::has($cooldownKey)) {
            throw new RuntimeException('Please wait before requesting another code.');
        }

        $length = (int) config('otp.length');
        $code = str_pad((string) random_int(0, 10 ** $length - 1), $length, '0', STR_PAD_LEFT);
        $ttl = (int) config('otp.ttl');

        // Deliver first: a failed send must not leave a usable code or a cooldown behind.
        $this->sms->send($mobile, "Your MediMind verification code is {$code}. It expires in " . intdiv($ttl, 60) . ' minutes.');

        Cache::put($this->key('code', $mobile), Hash::make($code), $ttl);
        Cache::put($this->key('attempts', $mobile), 0, $ttl);
        Cache::put($cooldownKey, true, (int) config('otp.resend_after'));
    }

    /**
     * Verify a code. A code is single-use and locks after too many wrong guesses.
     */
    public function verifyOtp(string $mobile, string $otp): bool
    {
        $hash = Cache::get($this->key('code', $mobile));
        if (! $hash) {
            return false;
        }

        $attempts = (int) Cache::get($this->key('attempts', $mobile), 0);
        if ($attempts >= (int) config('otp.max_attempts')) {
            $this->forget($mobile);
            return false;
        }

        if (! Hash::check($otp, $hash)) {
            Cache::put($this->key('attempts', $mobile), $attempts + 1, (int) config('otp.ttl'));
            return false;
        }

        $this->forget($mobile);
        return true;
    }

    private function forget(string $mobile): void
    {
        Cache::forget($this->key('code', $mobile));
        Cache::forget($this->key('attempts', $mobile));
    }

    private function key(string $type, string $mobile): string
    {
        return "otp:{$type}:" . sha1($mobile);
    }
}

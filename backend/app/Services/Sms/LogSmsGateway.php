<?php

namespace App\Services\Sms;

use App\Contracts\SmsGateway;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Development-only gateway: writes the message to the application log.
 * Refuses to run outside local/testing so a production deploy can never
 * silently "send" OTPs into a log file.
 */
class LogSmsGateway implements SmsGateway
{
    public function send(string $mobile, string $message): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('No SMS gateway configured. Set OTP_SMS_DRIVER and bind a real SmsGateway.');
        }

        Log::info('[sms:log] message', ['mobile' => $mobile, 'message' => $message]);
    }
}

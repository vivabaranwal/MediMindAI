<?php

return [

    /*
    | One-time-password login settings. Codes are random, stored hashed in the
    | cache, expire after `ttl` seconds and are locked after `max_attempts`
    | wrong guesses. There is no universal/master code.
    */

    'length'       => 6,
    'ttl'          => (int) env('OTP_TTL_SECONDS', 300),
    'max_attempts' => (int) env('OTP_MAX_ATTEMPTS', 5),
    'resend_after' => (int) env('OTP_RESEND_AFTER_SECONDS', 30),

    // Roles that may sign in with a mobile OTP. Doctors and admins must use a password.
    'allowed_roles' => ['patient', 'front_desk'],

    // 'log' writes the code to the application log and is only permitted in
    // local/testing environments. Any other environment must configure a real
    // SmsGateway implementation and set this to its driver name.
    'sms_driver' => env('OTP_SMS_DRIVER', 'log'),
];

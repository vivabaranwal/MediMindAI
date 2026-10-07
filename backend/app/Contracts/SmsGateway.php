<?php

namespace App\Contracts;

interface SmsGateway
{
    /**
     * Deliver a text message. Must throw on delivery failure.
     */
    public function send(string $mobile, string $message): void;
}

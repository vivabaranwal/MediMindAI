<?php

return [

    /*
    | Patients must have an active `ai_assistance` consent before any of their data is
    | sent to the AI engine (and from there to the model provider).
    */
    'require_consent' => (bool) env('AI_REQUIRE_CONSENT', true),

    // Seconds to wait for the engine, per call type.
    'timeouts' => [
        'default' => (int) env('AI_TIMEOUT_SECONDS', 60),
        'ingest'  => (int) env('AI_INGEST_TIMEOUT_SECONDS', 180),
    ],

    // Queue used for report analysis jobs.
    'report_queue' => env('AI_REPORT_QUEUE', 'default'),
];

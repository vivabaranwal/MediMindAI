<?php

return [

    /*
    | Key for the searchable "blind index" over encrypted patient fields (keyed hashes of name prefixes and
    | mobile numbers). Defaults to a key derived from APP_KEY. Set BLIND_INDEX_KEY (32+ random characters) to
    | keep it independent of APP_KEY; after changing it run `php artisan phi:reindex`.
    */
    'blind_index_key' => env('BLIND_INDEX_KEY') ?: hash('sha256', 'blind-index:' . env('APP_KEY', '')),

    // Shortest name fragment that can be searched (shorter prefixes are not indexed).
    'search_min_chars' => 3,
];

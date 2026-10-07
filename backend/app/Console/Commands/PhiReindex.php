<?php

namespace App\Console\Commands;

use App\Models\Patient;
use App\Models\User;
use App\Support\BlindIndex;
use Illuminate\Console\Command;

class PhiReindex extends Command
{
    protected $signature = 'phi:reindex';

    protected $description = 'Rebuild the searchable blind indexes (run after changing BLIND_INDEX_KEY).';

    public function handle(): int
    {
        $patients = 0;
        Patient::query()->orderBy('id')->chunkById(200, function ($rows) use (&$patients) {
            foreach ($rows as $p) {
                $p->mobile_hash = BlindIndex::mobileHash($p->mobile);
                $p->search_index = implode(' ', BlindIndex::patientTokens($p->name, $p->mobile));
                $p->saveQuietly();
                $patients++;
            }
        });

        $users = 0;
        User::query()->orderBy('id')->chunkById(200, function ($rows) use (&$users) {
            foreach ($rows as $u) {
                $u->mobile_hash = BlindIndex::mobileHash($u->mobile);
                $u->saveQuietly();
                $users++;
            }
        });

        $this->info("Reindexed {$patients} patient(s) and {$users} user(s).");

        return self::SUCCESS;
    }
}

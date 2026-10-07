<?php

namespace App\Console\Commands;

use App\Support\PhiProtector;
use Illuminate\Console\Command;

class PhiProtect extends Command
{
    protected $signature = 'phi:protect';

    protected $description = 'Encrypt any patient data still stored in plaintext and refresh blind indexes (idempotent).';

    public function handle(): int
    {
        foreach (PhiProtector::protectAll() as $table => $rows) {
            $this->line(sprintf('%-14s %d row(s) updated', $table, $rows));
        }
        $this->info('Done. Re-running is safe.');

        return self::SUCCESS;
    }
}

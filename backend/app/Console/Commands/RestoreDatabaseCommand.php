<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class RestoreDatabaseCommand extends Command
{
    protected $signature = 'db:restore {file : Path to the backup file to restore}';
    protected $description = 'Restore database from a backup file';

    public function handle(): int
    {
        $backupFile = $this->argument('file');

        if (!File::exists($backupFile)) {
            $this->error("Backup file not found: {$backupFile}");
            return 1;
        }

        $database = config('database.connections.sqlite.database');

        if ($database === ':memory:') {
            $this->info("In-memory database restore simulated.");
            return 0;
        }

        if (File::copy($backupFile, $database)) {
            $this->info("Database successfully restored from: {$backupFile}");
            return 0;
        }

        $this->error("Failed to restore database file.");
        return 1;
    }
}

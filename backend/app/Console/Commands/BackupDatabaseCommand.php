<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class BackupDatabaseCommand extends Command
{
    protected $signature = 'db:backup {--destination= : Custom destination path}';
    protected $description = 'Create an automated database backup';

    public function handle(): int
    {
        $database = config('database.connections.sqlite.database');
        
        if (!File::exists($database) && $database !== ':memory:') {
            $this->error("Database file not found at {$database}");
            return 1;
        }

        $backupDir = storage_path('app/backups');
        if (!File::exists($backupDir)) {
            File::makeDirectory($backupDir, 0755, true);
        }

        $filename = 'backup_' . date('Y_m_d_His') . '.sqlite';
        $destPath = $this->option('destination') ?: $backupDir . '/' . $filename;

        if ($database === ':memory:') {
            $this->info("In-memory database backup simulated.");
            return 0;
        }

        if (File::copy($database, $destPath)) {
            $this->info("Database successfully backed up to: {$destPath}");
            return 0;
        }

        $this->error("Failed to copy database file.");
        return 1;
    }
}

<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class BackupRestoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_backup_command_executes_successfully(): void
    {
        $backupDir = storage_path('app/backups');
        $testBackupFile = $backupDir . '/test_backup.sqlite';

        if (File::exists($testBackupFile)) {
            File::delete($testBackupFile);
        }

        $exitCode = Artisan::call('db:backup', ['--destination' => $testBackupFile]);
        
        $this->assertEquals(0, $exitCode);
    }

    public function test_database_restore_command_executes_successfully(): void
    {
        $backupDir = storage_path('app/backups');
        $testBackupFile = $backupDir . '/test_backup.sqlite';

        // Create a dummy backup file for testing restore
        if (!File::exists($backupDir)) {
            File::makeDirectory($backupDir, 0755, true);
        }
        File::put($testBackupFile, 'dummy database content');

        $exitCode = Artisan::call('db:restore', ['file' => $testBackupFile]);
        
        $this->assertEquals(0, $exitCode);

        if (File::exists($testBackupFile)) {
            File::delete($testBackupFile);
        }
    }
}

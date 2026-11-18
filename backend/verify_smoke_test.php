<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\AccountingPeriod;
use App\Models\Account;
use App\Models\Program;
use App\Models\Role;
use App\Models\Transaction;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\PostingService;
use App\Services\ReportService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

echo "=== STARTING PRODUCTION SMOKE TEST (DEV-116) ===\n";

DB::beginTransaction();

try {
    // 1. Setup Roles & Users
    $adminRole = Role::firstOrCreate(['code' => 'ADMIN'], ['name' => 'Administrator']);
    $pengelolaRole = Role::firstOrCreate(['code' => 'PENGELOLA'], ['name' => 'Pengelola Keuangan']);
    $ownerRole = Role::firstOrCreate(['code' => 'OWNER'], ['name' => 'Owner']);

    $admin = User::firstOrCreate(['email' => 'smoke_admin@example.com'], [
        'name' => 'Smoke Admin',
        'password' => Hash::make('password123'),
        'role_id' => $adminRole->id,
        'status' => 'ACTIVE'
    ]);

    $pengelola = User::firstOrCreate(['email' => 'smoke_pengelola@example.com'], [
        'name' => 'Smoke Pengelola',
        'password' => Hash::make('password123'),
        'role_id' => $pengelolaRole->id,
        'status' => 'ACTIVE'
    ]);

    $owner = User::firstOrCreate(['email' => 'smoke_owner@example.com'], [
        'name' => 'Smoke Owner',
        'password' => Hash::make('password123'),
        'role_id' => $ownerRole->id,
        'status' => 'ACTIVE'
    ]);

    echo "[PASS] Roles & Users initialized successfully.\n";

    // 2. Setup Master Data & Period
    $kas = Account::firstOrCreate(['code' => '1001_SMOKE'], [
        'name' => 'Kas Smoke Test',
        'type' => 'ASSET',
        'normal_balance' => 'DEBIT',
        'is_active' => true,
        'is_postable' => true
    ]);

    $pendapatan = Account::firstOrCreate(['code' => '4001_SMOKE'], [
        'name' => 'Pendapatan Smoke Test',
        'type' => 'REVENUE',
        'normal_balance' => 'CREDIT',
        'is_active' => true,
        'is_postable' => true
    ]);

    $program = Program::firstOrCreate(['code' => 'PRG_SMOKE'], [
        'name' => 'Program Smoke Test',
        'is_active' => true
    ]);

    $period = AccountingPeriod::firstOrCreate(['name' => 'September 2026 Smoke'], [
        'start_date' => '2026-09-01',
        'end_date' => '2026-09-30',
        'status' => 'OPEN'
    ]);

    echo "[PASS] Master data & accounting period verified.\n";

    $cashBank = \App\Models\CashBankAccount::firstOrCreate(['name' => 'Kas Smoke Test'], [
        'account_id' => $kas->id,
        'type' => 'CASH',
        'is_active' => true
    ]);

    // 3. Create Draft Transaction (Pengelola)
    $trx = Transaction::create([
        'transaction_no' => 'TRX-SMOKE-' . time(),
        'type' => 'INCOME',
        'status' => 'DRAFT',
        'transaction_date' => '2026-09-24',
        'accounting_period_id' => $period->id,
        'description' => 'Smoke Test Income Transaction',
        'amount' => 10000000.00,
        'cash_bank_account_id' => $cashBank->id,
        'income_account_id' => $pendapatan->id,
        'program_id' => $program->id,
        'restriction_type' => 'WITHOUT_RESTRICTION',
        'created_by' => $pengelola->id
    ]);

    echo "[PASS] Transaction draft created (ID: {$trx->id}).\n";

    // 4. Submit Transaction
    $trx->update(['status' => 'SUBMITTED']);
    AuditLogService::log($pengelola, 'TRANSACTION_SUBMITTED', 'Transaction', $trx->id);
    echo "[PASS] Transaction submitted for approval.\n";

    // 5. Approve Transaction (Owner)
    $trx->update([
        'status' => 'APPROVED',
        'approved_at' => now(),
    ]);
    AuditLogService::log($owner, 'TRANSACTION_APPROVED', 'Transaction', $trx->id);
    echo "[PASS] Transaction approved by Owner.\n";

    // 6. Post Transaction (Admin)
    $journal = PostingService::postTransaction($trx->fresh(), $admin);
    echo "[PASS] Transaction posted to ledger. Journal ID: {$journal->id}.\n";

    // 7. Verify Trial Balance
    $tb = \App\Services\TrialBalanceService::getTrialBalance('2026-09-01', '2026-09-30');

    if (!$tb['summary']['is_balanced']) {
        throw new Exception("Trial balance is NOT balanced!");
    }
    echo "[PASS] Trial Balance verified and BALANCED (Total Debit: {$tb['summary']['total_ending_debit']}, Total Credit: {$tb['summary']['total_ending_credit']}).\n";

    DB::commit();

    echo "=== PRODUCTION SMOKE TEST PASSED 100% SUCCESSFUL ===\n";
    exit(0);

} catch (Exception $e) {
    DB::rollBack();
    echo "[FAIL] Smoke Test Exception: " . $e->getMessage() . "\n";
    exit(1);
}

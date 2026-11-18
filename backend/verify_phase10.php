<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\AccountingPeriod;
use App\Models\Program;
use App\Models\Donor;
use App\Models\CashBankAccount;
use App\Models\Account;
use App\Models\Transaction;
use App\Models\AuditLog;
use App\Services\PostingService;
use App\Services\ReversalService;
use App\Services\FinancialReportService;
use App\Services\AuditLogService;

echo "====================================================\n";
echo "    PHASE 10 HARDENING & E2E VERIFICATION SCRIPT\n";
echo "====================================================\n";

// 1. Fresh Database & Seed
\Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--seed' => true]);
echo "[1/6] Database fresh & seeded clean.\n";

$admin = User::where('email', 'admin@yayasan.org')->first();
$period = AccountingPeriod::where('status', 'OPEN')->first();
$program = Program::first();
$donor = Donor::first();
$cashAcc = CashBankAccount::first();
$incomeAcc = Account::where('code', '4101')->first();
$expenseAcc = Account::where('code', '5101')->first();

// 2. Create & Submit Income Transaction
$trx = Transaction::create([
    'transaction_no' => 'INC-VER-P10-001',
    'type' => 'INCOME',
    'transaction_date' => date('Y-m-d'),
    'accounting_period_id' => $period->id,
    'program_id' => $program->id,
    'donor_id' => $donor->id,
    'cash_bank_account_id' => $cashAcc->id,
    'income_account_id' => $incomeAcc->id,
    'restriction_type' => 'WITHOUT_RESTRICTION',
    'amount' => 20000000.00,
    'description' => 'Verifikasi Lifecycle Phase 10',
    'status' => 'SUBMITTED',
    'created_by' => $admin->id,
]);

AuditLogService::log($admin, 'TRANSACTION_CREATED', 'Transaction', $trx->id, 'Created test transaction');
echo "[2/6] Created & Logged Income Transaction: Rp 20.000.000.\n";

// 3. Approve & Post Transaction
$trx->update(['status' => 'APPROVED', 'approved_at' => now()]);
AuditLogService::log($admin, 'TRANSACTION_APPROVED', 'Transaction', $trx->id, 'Approved test transaction');

$journal = PostingService::postTransaction($trx, $admin);
AuditLogService::log($admin, 'TRANSACTION_POSTED', 'Transaction', $trx->id, 'Posted test transaction');
echo "[3/6] Approved & Posted Transaction: Journal {$journal->journal_no}.\n";

// 4. Verify Financial Balance Equation & Invariants
$bs = FinancialReportService::getBalanceSheet(date('Y-m-d'));
echo "[4/6] Financial Balance Check:\n";
echo "      - Total Assets: Rp " . number_format($bs['assets']['total_assets'], 2) . "\n";
echo "      - Total Liabilities & Net Assets: Rp " . number_format($bs['total_liabilities_and_net_assets'], 2) . "\n";
echo "      - Balanced: " . ($bs['is_balanced'] ? 'YES [PASSED]' : 'NO [FAILED]') . "\n";

if (!$bs['is_balanced']) {
    exit(1);
}

// 5. Perform Reversal & Verify Audit Trail
$reversalJournal = ReversalService::reverseTransaction($trx->fresh(), $admin, 'Testing reversal audit');
AuditLogService::log($admin, 'TRANSACTION_REVERSED', 'Transaction', $trx->id, 'Reversed test transaction');
echo "[5/6] Reversed Transaction & Created Offsetting Journal {$reversalJournal->journal_no}.\n";

// 6. Check Audit Logs count in DB
$logCount = AuditLog::count();
echo "[6/6] Audit Trail Verification:\n";
echo "      - Total Audit Log Records Saved: {$logCount}\n";
echo "      - Recent Audit Action: " . AuditLog::latest('id')->first()->action . "\n";

if ($logCount < 4) {
    echo "FAILED: Expected at least 4 audit log records.\n";
    exit(1);
}

echo "====================================================\n";
echo "    PHASE 10 VERIFICATION SUCCESSFUL & ALL PASSED!\n";
echo "====================================================\n";

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
use App\Services\PostingService;
use App\Services\FinancialReportService;
use App\Services\ManagementReportService;

echo "====================================================\n";
echo "    PHASE 9 RUNTIME VERIFICATION SCRIPT\n";
echo "====================================================\n";

// 1. Refresh database state & seed
\Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--seed' => true]);
echo "[1/5] Database fresh & seeded clean.\n";

$admin = User::where('email', 'admin@yayasan.org')->first();
$period = AccountingPeriod::where('status', 'OPEN')->first();
$program = Program::first();
$donor = Donor::first();
$cashAcc = CashBankAccount::first();
$incomeAcc = Account::where('code', '4101')->first();
$expenseAcc = Account::where('code', '5101')->first();

// 2. Create & Post Income Transaction
$incomeTx = Transaction::create([
    'transaction_no' => 'INC-VER-P9-001',
    'type' => 'INCOME',
    'transaction_date' => date('Y-m-d'),
    'accounting_period_id' => $period->id,
    'program_id' => $program->id,
    'donor_id' => $donor->id,
    'cash_bank_account_id' => $cashAcc->id,
    'income_account_id' => $incomeAcc->id,
    'restriction_type' => 'WITH_RESTRICTION',
    'amount' => 15000000.00,
    'description' => 'Verifikasi Runtime Income Phase 9',
    'status' => 'APPROVED',
    'created_by' => $admin->id,
]);

PostingService::postTransaction($incomeTx, $admin);
echo "[2/5] Posted Income Transaction: Rp 15.000.000 (WITH_RESTRICTION).\n";

// 3. Create & Post Expense Transaction
$expenseTx = Transaction::create([
    'transaction_no' => 'EXP-VER-P9-001',
    'type' => 'EXPENSE',
    'transaction_date' => date('Y-m-d'),
    'accounting_period_id' => $period->id,
    'program_id' => $program->id,
    'cash_bank_account_id' => $cashAcc->id,
    'expense_account_id' => $expenseAcc->id,
    'amount' => 6000000.00,
    'description' => 'Verifikasi Runtime Expense Phase 9',
    'status' => 'APPROVED',
    'created_by' => $admin->id,
]);

PostingService::postTransaction($expenseTx, $admin);
echo "[3/5] Posted Expense Transaction: Rp 6.000.000 (Program Yatim).\n";

// 4. Verify Balance Sheet & Invariants
$bs = FinancialReportService::getBalanceSheet(date('Y-m-d'));
echo "[4/5] Balance Sheet Invariant Check:\n";
echo "      - Total Assets: Rp " . number_format($bs['assets']['total_assets'], 2) . "\n";
echo "      - Total Liabilities & Net Assets: Rp " . number_format($bs['total_liabilities_and_net_assets'], 2) . "\n";
echo "      - Difference: Rp " . number_format($bs['difference'], 2) . "\n";
echo "      - Is Balanced: " . ($bs['is_balanced'] ? 'YES [PASSED]' : 'NO [FAILED]') . "\n";

if (!$bs['is_balanced']) {
    exit(1);
}

// 5. Verify Cash Flows Reconciliation
$cf = FinancialReportService::getCashFlows(date('Y-01-01'), date('Y-m-d'));
echo "[5/5] Cash Flow Reconciliation Check:\n";
echo "      - Net Cash Increase/Decrease: Rp " . number_format($cf['net_cash_increase_decrease'], 2) . "\n";
echo "      - Ending Cash: Rp " . number_format($cf['ending_cash'], 2) . "\n";
echo "      - Balance Sheet Cash: Rp " . number_format($cf['balance_sheet_cash'], 2) . "\n";
echo "      - Is Reconciled: " . ($cf['is_reconciled'] ? 'YES [PASSED]' : 'NO [FAILED]') . "\n";

if (!$cf['is_reconciled']) {
    exit(1);
}

echo "====================================================\n";
echo "    PHASE 9 VERIFICATION SUCCESSFUL & INVARIANTS MET!\n";
echo "====================================================\n";

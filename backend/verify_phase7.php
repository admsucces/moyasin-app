<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Transaction;
use App\Models\Journal;
use App\Models\CashBankAccount;
use App\Models\Account;
use App\Models\AccountingPeriod;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Http\Request;

echo "========================================================\n";
echo "    PHASE 7 LIVE HTTP & RUNTIME VERIFICATION SCRIPT     \n";
echo "========================================================\n\n";

// 1. Refresh & Seed Database
echo "[1/6] Refreshing database & running seeders...\n";
Artisan::call('migrate:fresh', ['--seed' => true]);
echo "      Database refreshed & seeded successfully.\n\n";

$admin = User::where('email', 'admin@yayasan.org')->firstOrFail();
$pengelola = User::where('email', 'pengelola@yayasan.org')->firstOrFail();
$owner = User::where('email', 'owner@yayasan.org')->firstOrFail();
$kasBank = CashBankAccount::firstOrFail();
$accKas = Account::where('id', $kasBank->account_id)->firstOrFail();
$accDonasi = Account::where('type', 'INCOME')->where('is_postable', true)->firstOrFail();
$accBeban = Account::where('type', 'EXPENSE')->where('is_postable', true)->firstOrFail();
$openPeriod = AccountingPeriod::where('status', 'OPEN')->firstOrFail();

// Helper to simulate HTTP requests
function makeRequest($method, $uri, $data = [], $user = null) {
    global $app;
    
    $req = Request::create($uri, $method, $data);
    $req->headers->set('Accept', 'application/json');
    
    if ($user) {
        $app['auth']->guard('sanctum')->setUser($user);
    }
    
    $response = $app->handle($req);
    return [
        'status' => $response->getStatusCode(),
        'json' => json_decode($response->getContent(), true)
    ];
}

// 2. Post Income & Expense Transactions
echo "[2/6] Posting Financial Transactions (Income: 12M, Expense: 4M)...\n";
// Income 12M
$incomeTrx = Transaction::create([
    'transaction_no' => 'TRX-2026-09701',
    'type' => 'INCOME',
    'transaction_date' => '2026-09-10',
    'accounting_period_id' => $openPeriod->id,
    'income_account_id' => $accDonasi->id,
    'cash_bank_account_id' => $kasBank->id,
    'amount' => 12000000.00,
    'description' => 'Penerimaan Donasi Pendidikan',
    'status' => 'APPROVED',
    'created_by' => $pengelola->id,
]);
$postIncRes = makeRequest('POST', "/api/v1/transactions/{$incomeTrx->id}/post", [], $admin);
assert($postIncRes['status'] === 200, "Failed posting income transaction");
echo "      Income Transaction Posted: 12,000,000.00 IDR\n";

// Expense 4M
$expenseTrx = Transaction::create([
    'transaction_no' => 'TRX-2026-09702',
    'type' => 'EXPENSE',
    'transaction_date' => '2026-09-15',
    'accounting_period_id' => $openPeriod->id,
    'expense_account_id' => $accBeban->id,
    'cash_bank_account_id' => $kasBank->id,
    'amount' => 4000000.00,
    'description' => 'Beban Operasional Beasiswa',
    'status' => 'APPROVED',
    'created_by' => $pengelola->id,
]);
$postExpRes = makeRequest('POST', "/api/v1/transactions/{$expenseTrx->id}/post", [], $admin);
assert($postExpRes['status'] === 200, "Failed posting expense transaction");
echo "      Expense Transaction Posted: 4,000,000.00 IDR\n\n";

// 3. Unposted Transaction Isolation Check
echo "[3/6] Verifying Isolation of Unposted (DRAFT/SUBMITTED) Transactions...\n";
$draftTrx = Transaction::create([
    'transaction_no' => 'TRX-DRAFT-999',
    'type' => 'INCOME',
    'transaction_date' => '2026-09-20',
    'accounting_period_id' => $openPeriod->id,
    'income_account_id' => $accDonasi->id,
    'cash_bank_account_id' => $kasBank->id,
    'amount' => 99000000.00,
    'description' => 'Draft Unposted Donasi',
    'status' => 'DRAFT',
    'created_by' => $pengelola->id,
]);
echo "      Unposted Draft Transaction Created (99,000,000 IDR)\n\n";

// 4. Verify General Ledger API (GET /api/v1/accounting/ledger)
echo "[4/6] Verifying General Ledger API (GET /api/v1/accounting/ledger)...\n";
$ledgerRes = makeRequest('GET', "/api/v1/accounting/ledger?account_id={$accKas->id}", [], $pengelola);
assert($ledgerRes['status'] === 200, "Failed retrieving General Ledger");
$ledger = $ledgerRes['json']['data'];

echo "      Ledger Statement for [{$ledger['account']['code']}] {$ledger['account']['name']}:\n";
echo "        - Opening Balance: " . number_format($ledger['opening_balance'], 2) . "\n";
echo "        - Total Period Debit: " . number_format($ledger['total_period_debit'], 2) . "\n";
echo "        - Total Period Credit: " . number_format($ledger['total_period_credit'], 2) . "\n";
echo "        - Closing Balance: " . number_format($ledger['closing_balance'], 2) . "\n";
echo "        - Entries Count: " . count($ledger['entries']) . "\n";

assert($ledger['closing_balance'] == 8000000.00, "Kas Closing balance calculation mismatch!");
assert(count($ledger['entries']) == 2, "Entries count mismatch (Draft was included!)");
echo "      Ledger Calculations & Isolation Verified Successfully!\n\n";

// 5. Verify Trial Balance API (GET /api/v1/accounting/trial-balance)
echo "[5/6] Verifying Trial Balance API (GET /api/v1/accounting/trial-balance)...\n";
$tbRes = makeRequest('GET', '/api/v1/accounting/trial-balance', [], $owner);
assert($tbRes['status'] === 200, "Failed retrieving Trial Balance");
$tb = $tbRes['json']['data'];

echo "      Trial Balance Summary:\n";
echo "        - Total Ending Debit: " . number_format($tb['summary']['total_ending_debit'], 2) . "\n";
echo "        - Total Ending Credit: " . number_format($tb['summary']['total_ending_credit'], 2) . "\n";
echo "        - Difference: " . number_format($tb['summary']['difference'], 2) . "\n";
echo "        - Is Balanced: " . ($tb['summary']['is_balanced'] ? 'TRUE' : 'FALSE') . "\n";

assert($tb['summary']['is_balanced'] === true, "Trial Balance is NOT balanced!");
assert($tb['summary']['total_ending_debit'] == 12000000.00, "Ending Debit total mismatch!");
assert($tb['summary']['total_ending_credit'] == 12000000.00, "Ending Credit total mismatch!");
echo "      Trial Balance Invariants Verified Successfully!\n\n";

// 6. Final Status
echo "========================================================\n";
echo "    ALL PHASE 7 RUNTIME VERIFICATIONS PASSED SUCCESSFULLY! \n";
echo "========================================================\n";

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
echo "    PHASE 8 LIVE HTTP & RUNTIME VERIFICATION SCRIPT     \n";
echo "========================================================\n\n";

// 1. Refresh & Seed Database
echo "[1/7] Refreshing database & running seeders...\n";
Artisan::call('migrate:fresh', ['--seed' => true]);
echo "      Database refreshed & seeded successfully.\n\n";

$admin = User::where('email', 'admin@yayasan.org')->firstOrFail();
$pengelola = User::where('email', 'pengelola@yayasan.org')->firstOrFail();
$owner = User::where('email', 'owner@yayasan.org')->firstOrFail();
$kasBank = CashBankAccount::firstOrFail();
$accKas = Account::where('id', $kasBank->account_id)->firstOrFail();
$accDonasi = Account::where('type', 'INCOME')->where('is_postable', true)->firstOrFail();
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

// 2. Post Income Transaction (15M)
echo "[2/7] Posting Financial Transaction for Reversal Test (15,000,000 IDR)...\n";
$trx = Transaction::create([
    'transaction_no' => 'TRX-2026-09801',
    'type' => 'INCOME',
    'transaction_date' => '2026-09-10',
    'accounting_period_id' => $openPeriod->id,
    'income_account_id' => $accDonasi->id,
    'cash_bank_account_id' => $kasBank->id,
    'amount' => 15000000.00,
    'description' => 'Donasi Salah Catat',
    'status' => 'APPROVED',
    'created_by' => $pengelola->id,
]);

$postRes = makeRequest('POST', "/api/v1/transactions/{$trx->id}/post", [], $admin);
assert($postRes['status'] === 200, "Failed posting transaction");
echo "      Transaction Posted: ID {$trx->id} (Status: POSTED)\n\n";

// 3. Security Check: Non-Admin Reversal Prohibition
echo "[3/7] Verifying Reversal Authorization (Non-Admin Prohibition)...\n";
$forbidRes = makeRequest('POST', "/api/v1/transactions/{$trx->id}/reverse", ['reason' => 'Pengelola attempt'], $pengelola);
assert($forbidRes['status'] === 403, "Non-admin reversal was not forbidden!");
echo "      Security Rule Verified: Non-Admin role receives HTTP 403 Forbidden.\n\n";

// 4. Atomic Transaction Reversal Execution
echo "[4/7] Executing Atomic Transaction Reversal as ADMIN...\n";
$revRes = makeRequest('POST', "/api/v1/transactions/{$trx->id}/reverse", [
    'reason' => 'Pembalikan karena kesalahan input nominal dan sumber donatur'
], $admin);

assert($revRes['status'] === 200, "Failed reversing transaction");
echo "      Reversal Successful: HTTP 200 OK\n";
echo "      Updated Status: " . $revRes['json']['data']['status'] . "\n";
echo "      Reversal Journal No: " . $revRes['json']['data']['reversal_journal']['journal_no'] . "\n";

// Verify Duplicate Reversal Blocked
$dupRevRes = makeRequest('POST', "/api/v1/transactions/{$trx->id}/reverse", ['reason' => 'Second attempt'], $admin);
assert($dupRevRes['status'] === 409, "Duplicate reversal did not return 409!");
echo "      Invariant Verified: Duplicate reversal attempt returns HTTP 409 Conflict.\n\n";

// 5. Verify Ledger & Trial Balance After Reversal
echo "[5/7] Verifying Accounting Reconciliation After Reversal...\n";
$tbRes = makeRequest('GET', '/api/v1/accounting/trial-balance', [], $owner);
assert($tbRes['status'] === 200, "Failed fetching Trial Balance");
$tb = $tbRes['json']['data'];

echo "      Trial Balance Post-Reversal:\n";
echo "        - Total Ending Debit: " . number_format($tb['summary']['total_ending_debit'], 2) . "\n";
echo "        - Total Ending Credit: " . number_format($tb['summary']['total_ending_credit'], 2) . "\n";
echo "        - Is Balanced: " . ($tb['summary']['is_balanced'] ? 'TRUE' : 'FALSE') . "\n";

assert($tb['summary']['is_balanced'] === true, "Trial balance is not balanced post-reversal!");
assert($tb['summary']['total_ending_debit'] == 0, "Ending balance should be 0 after full reversal!");
echo "      Accounting Integrity Verified: Net ending balance is exactly 0.00 IDR.\n\n";

// 6. Period Closing Guard & Reopen Workflow
echo "[6/7] Verifying Period Control (Close Period Guard & Reopen Workflow)...\n";
// Create pending draft in period
$draft = Transaction::create([
    'transaction_no' => 'TRX-DRAFT-GUARD',
    'type' => 'INCOME',
    'transaction_date' => '2026-09-12',
    'accounting_period_id' => $openPeriod->id,
    'income_account_id' => $accDonasi->id,
    'cash_bank_account_id' => $kasBank->id,
    'amount' => 1000000.00,
    'description' => 'Draft Pending',
    'status' => 'DRAFT',
    'created_by' => $pengelola->id,
]);

// Attempt to close period with draft -> 422
$closeBlocked = makeRequest('POST', "/api/v1/accounting-periods/{$openPeriod->id}/close", [], $admin);
assert($closeBlocked['status'] === 422, "Closing period with pending draft did not return 422!");
echo "      Period Guard Verified: Closing period with pending draft returns HTTP 422 Unprocessable Entity.\n";

// Remove draft & close period
$draft->delete();
$closeOk = makeRequest('POST', "/api/v1/accounting-periods/{$openPeriod->id}/close", [], $admin);
assert($closeOk['status'] === 200, "Failed closing period");
echo "      Period Successfully Closed: Status = CLOSED\n";

// Attempt to post transaction in CLOSED period -> 422
$unpostedTrx = Transaction::create([
    'transaction_no' => 'TRX-CLOSED-TEST',
    'type' => 'INCOME',
    'transaction_date' => '2026-09-14',
    'accounting_period_id' => $openPeriod->id,
    'income_account_id' => $accDonasi->id,
    'cash_bank_account_id' => $kasBank->id,
    'amount' => 5000000.00,
    'description' => 'Posting in closed period',
    'status' => 'APPROVED',
    'created_by' => $pengelola->id,
]);

$postClosedRes = makeRequest('POST', "/api/v1/transactions/{$unpostedTrx->id}/post", [], $admin);
assert($postClosedRes['status'] === 422, "Posting in CLOSED period was not blocked!");
echo "      Closed Period Protection Verified: Posting in CLOSED period returns HTTP 422 Unprocessable Entity.\n";

// Reopen period by OWNER
$reopenRes = makeRequest('POST', "/api/v1/accounting-periods/{$openPeriod->id}/reopen", ['reason' => 'Penyesuaian transaksi akhir periode'], $owner);
assert($reopenRes['status'] === 200, "Failed reopening period");
echo "      Period Successfully Reopened by OWNER: Status = OPEN\n\n";

// 7. Final Status
echo "========================================================\n";
echo "    ALL PHASE 8 RUNTIME VERIFICATIONS PASSED SUCCESSFULLY! \n";
echo "========================================================\n";

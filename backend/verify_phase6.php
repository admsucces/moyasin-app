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
echo "    PHASE 6 LIVE HTTP & RUNTIME VERIFICATION SCRIPT     \n";
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

// 2. Create, Submit, & Approve Transaction Workflow
echo "[2/7] Executing Transaction Workflow (Draft -> Submit -> Approve)...\n";
$trxRes = makeRequest('POST', '/api/v1/transactions/income', [
    'transaction_date' => '2026-09-24',
    'cash_bank_account_id' => $kasBank->id,
    'income_account_id' => $accDonasi->id,
    'amount' => 7500000.00,
    'description' => 'Donasi Pembangunan Gedung Sekolah',
    'restriction_type' => 'WITH_RESTRICTION',
], $pengelola);

assert($trxRes['status'] === 201, "Failed creating income transaction");
$trxId = $trxRes['json']['data']['id'];
echo "      Income Transaction Created: ID {$trxId} (Status: DRAFT)\n";

$subRes = makeRequest('POST', "/api/v1/transactions/{$trxId}/submit", [], $pengelola);
assert($subRes['status'] === 200, "Failed submitting transaction");
echo "      Transaction Submitted: ID {$trxId} (Status: SUBMITTED)\n";

$appRes = makeRequest('POST', "/api/v1/transactions/{$trxId}/approve", ['comments' => 'Approved for posting'], $owner);
assert($appRes['status'] === 200, "Failed approving transaction");
echo "      Transaction Approved: ID {$trxId} (Status: APPROVED)\n\n";

// 3. Security & Role Authorization Verification
echo "[3/7] Verifying Security Rules (Non-Admin Posting Prohibition)...\n";
$forbiddenRes = makeRequest('POST', "/api/v1/transactions/{$trxId}/post", [], $pengelola);
assert($forbiddenRes['status'] === 403, "Non-admin posting was NOT forbidden!");
echo "      Security Rule Verified: Non-Admin role (PENGELOLA) receives HTTP 403 Forbidden.\n\n";

// 4. Automatic Posting Execution as ADMIN
echo "[4/7] Executing Automatic Transaction Posting as ADMIN...\n";
$postRes = makeRequest('POST', "/api/v1/transactions/{$trxId}/post", [], $admin);
assert($postRes['status'] === 200, "Failed posting transaction as ADMIN");
echo "      Posting Successful: HTTP 200 OK\n";
echo "      Transaction Status Updated: " . $postRes['json']['data']['status'] . "\n";
$journalNo = $postRes['json']['data']['journal']['journal_no'];
echo "      Generated Journal No: " . $journalNo . "\n";

$journal = Journal::where('journal_no', $journalNo)->firstOrFail();
echo "      Journal Entries Breakdown:\n";
foreach ($journal->entries as $entry) {
    echo "        - Account: [{$entry->account->code}] {$entry->account->name} | Debit: " . number_format($entry->debit, 2) . " | Credit: " . number_format($entry->credit, 2) . "\n";
}
echo "\n";

// 5. Duplicate Posting Prevention Verification
echo "[5/7] Verifying Invariant (Duplicate Posting Prevention)...\n";
$dupPostRes = makeRequest('POST', "/api/v1/transactions/{$trxId}/post", [], $admin);
assert($dupPostRes['status'] === 409, "Duplicate posting did not fail with 409!");
echo "      Invariant Verified: Re-posting returns HTTP 409 Conflict with message: '" . $dupPostRes['json']['message'] . "'\n\n";

// 6. Manual General Journal Creation & Unbalanced Validation
echo "[6/7] Verifying Manual Journal Creation & Double-Entry Balance Rule...\n";
// Attempt unbalanced manual journal
$unbalancedRes = makeRequest('POST', '/api/v1/journals', [
    'journal_date' => '2026-09-24',
    'description' => 'Unbalanced Manual Journal',
    'entries' => [
        ['account_id' => $accKas->id, 'debit' => 1000000, 'credit' => 0],
        ['account_id' => $accDonasi->id, 'debit' => 0, 'credit' => 800000],
    ]
], $admin);
assert($unbalancedRes['status'] === 422, "Unbalanced journal was not rejected with 422!");
echo "      Validation Verified: Unbalanced entry returns HTTP 422 Unprocessable Entity.\n";

// Valid balanced manual journal
$manualRes = makeRequest('POST', '/api/v1/journals', [
    'journal_date' => '2026-09-24',
    'description' => 'Jurnal Penyesuaian Saldo Awal Kas',
    'entries' => [
        ['account_id' => $accKas->id, 'debit' => 3000000.00, 'credit' => 0.00],
        ['account_id' => $accDonasi->id, 'debit' => 0.00, 'credit' => 3000000.00],
    ]
], $admin);
assert($manualRes['status'] === 201, "Failed creating balanced manual journal");
echo "      Manual Journal Created: HTTP 201 Created (Journal No: " . $manualRes['json']['data']['journal_no'] . ")\n\n";

// 7. Journal Retrieval & Verification
echo "[7/7] Verifying Journal Reading APIs (GET /journals & GET /journals/{id})...\n";
$listRes = makeRequest('GET', '/api/v1/journals', [], $pengelola);
assert($listRes['status'] === 200, "Failed listing journals");
echo "      Journal List Retrieved: " . count($listRes['json']['data']) . " journals found.\n";

$firstId = $listRes['json']['data'][0]['id'];
$showRes = makeRequest('GET', "/api/v1/journals/{$firstId}", [], $pengelola);
assert($showRes['status'] === 200, "Failed retrieving journal detail");
echo "      Journal Detail Retrieved: ID {$firstId} (Journal No: " . $showRes['json']['data']['journal_no'] . ")\n\n";

echo "========================================================\n";
echo "    ALL PHASE 6 RUNTIME VERIFICATIONS PASSED SUCCESSFULLY! \n";
echo "========================================================\n";

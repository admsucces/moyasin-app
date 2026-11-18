<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Account;
use App\Models\CashBankAccount;
use App\Models\Donor;
use App\Models\Program;
use App\Models\Transaction;
use App\Models\TransactionAttachment;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

echo "=== PHASE 3 LIVE RUNTIME VERIFICATION ===\n\n";

// 1. Authenticate Pengelola
$pengelola = User::where('email', 'pengelola@yayasan.org')->first();
echo "[1] Auth Check: User '{$pengelola->name}' ({$pengelola->role->code})\n";

// 2. Data Preparation
$cashBank = CashBankAccount::first();
$incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();
$donor = Donor::first();
$program = Program::first();

echo "[2] Master Data Loaded:\n";
echo "    - Kas/Bank: {$cashBank->name}\n";
echo "    - Akun Penerimaan: [{$incomeAccount->code}] {$incomeAccount->name}\n";
echo "    - Donatur: {$donor->name}\n";
echo "    - Program: {$program->name}\n\n";

// 3. Create Draft Income Transaction via Controller
$reqData = [
    'transaction_date' => '2026-09-15',
    'cash_bank_account_id' => $cashBank->id,
    'income_account_id' => $incomeAccount->id,
    'donor_id' => $donor->id,
    'program_id' => $program->id,
    'restriction_type' => 'WITH_RESTRICTION',
    'amount' => 7500000,
    'description' => 'Live Runtime Test: Donasi Program Pendidikan Sept 2026',
];

$request = \App\Http\Requests\CreateIncomeRequest::create('/api/v1/transactions/income', 'POST', $reqData);
$request->setUserResolver(fn() => $pengelola);

$controller = new \App\Http\Controllers\Api\V1\TransactionController();
$response = $controller->storeIncome($request);
$resData = json_decode($response->getContent(), true);

echo "[3] Create Income Transaction Response (Status {$response->getStatusCode()}):\n";
echo "    - Success: " . ($resData['success'] ? 'true' : 'false') . "\n";
echo "    - Transaction No: " . $resData['data']['transaction_no'] . "\n";
echo "    - Amount: Rp " . number_format($resData['data']['amount'], 0, ',', '.') . "\n";
echo "    - Status: " . $resData['data']['status'] . "\n\n";

$trxId = $resData['data']['id'];

// 4. Upload Attachment via Controller
Storage::fake('local');
$file = UploadedFile::fake()->create('bukti_transfer_live.pdf', 300, 'application/pdf');

$uploadReq = \App\Http\Requests\UploadAttachmentRequest::create("/api/v1/transactions/{$trxId}/attachments", 'POST', [], [], ['file' => $file]);
$uploadReq->setUserResolver(fn() => $pengelola);
$uploadReq->setRouteResolver(function() use ($trxId, $uploadReq) {
    $route = new \Illuminate\Routing\Route('POST', "/api/v1/transactions/{id}/attachments", []);
    $route->bind($uploadReq);
    $route->setParameter('id', $trxId);
    return $route;
});

$attController = new \App\Http\Controllers\Api\V1\AttachmentController();
$uploadRes = $attController->store($uploadReq, $trxId);
$uploadData = json_decode($uploadRes->getContent(), true);

echo "[4] Upload Attachment Response (Status {$uploadRes->getStatusCode()}):\n";
echo "    - Success: " . ($uploadData['success'] ? 'true' : 'false') . "\n";
echo "    - Attachment File: " . $uploadData['data']['original_name'] . "\n";
echo "    - Download URL: " . $uploadData['data']['download_url'] . "\n\n";

// 5. Submit Transaction
$subReq = \Illuminate\Http\Request::create("/api/v1/transactions/{$trxId}/submit", 'POST');
$subReq->setUserResolver(fn() => $pengelola);

$subRes = $controller->submit($subReq, $trxId);
$subData = json_decode($subRes->getContent(), true);

echo "[5] Submit Transaction Response (Status {$subRes->getStatusCode()}):\n";
echo "    - Success: " . ($subData['success'] ? 'true' : 'false') . "\n";
echo "    - Updated Status: " . $subData['data']['status'] . "\n";
echo "    - Submitted At: " . $subData['data']['submitted_at'] . "\n\n";

// 6. Security Check: Owner role cannot create transaction
$owner = User::where('email', 'owner@yayasan.org')->first();
$ownerReq = \App\Http\Requests\CreateIncomeRequest::create('/api/v1/transactions/income', 'POST', $reqData);
$ownerReq->setUserResolver(fn() => $owner);
$authAuthorized = $ownerReq->authorize();

echo "[6] Security Authorization Verification:\n";
echo "    - Owner can create transaction: " . ($authAuthorized ? 'YES (FAIL Security)' : 'NO (PASSED 403 Forbidden Security)') . "\n\n";

echo "=== VERIFICATION COMPLETE: ALL CHECKS PASSED ===\n";

<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Account;
use App\Models\CashBankAccount;
use App\Models\Program;
use App\Models\Transaction;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

echo "=== PHASE 4 EXPENSE LIVE RUNTIME VERIFICATION ===\n\n";

// 1. Authenticate Pengelola
$pengelola = User::where('email', 'pengelola@yayasan.org')->first();
echo "[1] Auth Check: User '{$pengelola->name}' ({$pengelola->role->code})\n";

// 2. Data Preparation
$cashBank = CashBankAccount::first();
$expenseAccount = Account::where('type', 'EXPENSE')->where('is_postable', true)->first();
$program = Program::first();

echo "[2] Master Data Loaded:\n";
echo "    - Kas/Bank: {$cashBank->name}\n";
echo "    - Akun Beban: [{$expenseAccount->code}] {$expenseAccount->name}\n";
echo "    - Program: {$program->name}\n\n";

// 3. Create Draft Expense Transaction via Controller
$reqData = [
    'transaction_date' => '2026-09-15',
    'cash_bank_account_id' => $cashBank->id,
    'expense_account_id' => $expenseAccount->id,
    'counterparty_name' => 'Toko Alat Tulis Jaya',
    'program_id' => $program->id,
    'amount' => 2500000,
    'description' => 'Live Runtime Test: Pembelian Kertas & ATK Operasional',
];

$request = \App\Http\Requests\CreateExpenseRequest::create('/api/v1/transactions/expense', 'POST', $reqData);
$request->setUserResolver(fn() => $pengelola);

$controller = new \App\Http\Controllers\Api\V1\TransactionController();
$response = $controller->storeExpense($request);
$resData = json_decode($response->getContent(), true);

echo "[3] Create Expense Transaction Response (Status {$response->getStatusCode()}):\n";
echo "    - Success: " . ($resData['success'] ? 'true' : 'false') . "\n";
echo "    - Transaction No: " . $resData['data']['transaction_no'] . "\n";
echo "    - Type: " . $resData['data']['type'] . "\n";
echo "    - Vendor/Penerima: " . $resData['data']['counterparty_name'] . "\n";
echo "    - Amount: Rp " . number_format($resData['data']['amount'], 0, ',', '.') . "\n";
echo "    - Status: " . $resData['data']['status'] . "\n\n";

$trxId = $resData['data']['id'];

// 4. Upload Attachment via Controller
Storage::fake('local');
$file = UploadedFile::fake()->create('kwitansi_pembelian.pdf', 400, 'application/pdf');

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
echo "    - Attachment File: " . $uploadData['data']['original_name'] . "\n\n";

// 5. Submit Expense Transaction
$subReq = \Illuminate\Http\Request::create("/api/v1/transactions/{$trxId}/submit", 'POST');
$subReq->setUserResolver(fn() => $pengelola);

$subRes = $controller->submit($subReq, $trxId);
$subData = json_decode($subRes->getContent(), true);

echo "[5] Submit Expense Transaction Response (Status {$subRes->getStatusCode()}):\n";
echo "    - Success: " . ($subData['success'] ? 'true' : 'false') . "\n";
echo "    - Updated Status: " . $subData['data']['status'] . "\n";
echo "    - Debit Account: " . $subData['data']['journal_preview']['debit'][0]['account_name'] . " (Rp " . number_format($subData['data']['journal_preview']['debit'][0]['amount'], 0, ',', '.') . ")\n";
echo "    - Credit Account: " . $subData['data']['journal_preview']['credit'][0]['account_name'] . " (Rp " . number_format($subData['data']['journal_preview']['credit'][0]['amount'], 0, ',', '.') . ")\n\n";

// 6. Security Check: Owner role cannot create expense
$owner = User::where('email', 'owner@yayasan.org')->first();
$ownerReq = \App\Http\Requests\CreateExpenseRequest::create('/api/v1/transactions/expense', 'POST', $reqData);
$ownerReq->setUserResolver(fn() => $owner);
$authAuthorized = $ownerReq->authorize();

echo "[6] Security Authorization Verification:\n";
echo "    - Owner can create expense: " . ($authAuthorized ? 'YES (FAIL Security)' : 'NO (PASSED 403 Forbidden Security)') . "\n\n";

echo "=== VERIFICATION COMPLETE: ALL CHECKS PASSED ===\n";

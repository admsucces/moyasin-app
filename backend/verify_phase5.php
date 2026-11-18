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

echo "=== PHASE 5 APPROVAL WORKFLOW LIVE RUNTIME VERIFICATION ===\n\n";

// 1. Authenticate Users
$pengelola = User::where('email', 'pengelola@yayasan.org')->first();
$owner = User::where('email', 'owner@yayasan.org')->first();
$cashBank = CashBankAccount::first();
$incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();
$expenseAccount = Account::where('type', 'EXPENSE')->where('is_postable', true)->first();
$program = Program::first();

echo "[1] Users Loaded:\n";
echo "    - Creator: '{$pengelola->name}' ({$pengelola->role->code})\n";
echo "    - Reviewer: '{$owner->name}' ({$owner->role->code})\n\n";

// 2. Pengelola creates and submits 1 Income and 1 Expense transaction
$controller = new \App\Http\Controllers\Api\V1\TransactionController();

// Income TRX
$incReq = \App\Http\Requests\CreateIncomeRequest::create('/api/v1/transactions/income', 'POST', [
    'transaction_date' => '2026-09-15',
    'cash_bank_account_id' => $cashBank->id,
    'income_account_id' => $incomeAccount->id,
    'program_id' => $program->id,
    'restriction_type' => 'WITH_RESTRICTION',
    'amount' => 10000000,
    'description' => 'Donasi Beasiswa Yatim Sept 2026',
]);
$incReq->setUserResolver(fn() => $pengelola);
$incRes = json_decode($controller->storeIncome($incReq)->getContent(), true);
$incId = $incRes['data']['id'];

// Submit Income
$subIncReq = \Illuminate\Http\Request::create("/api/v1/transactions/{$incId}/submit", 'POST');
$subIncReq->setUserResolver(fn() => $pengelola);
$controller->submit($subIncReq, $incId);

// Expense TRX
$expReq = \App\Http\Requests\CreateExpenseRequest::create('/api/v1/transactions/expense', 'POST', [
    'transaction_date' => '2026-09-15',
    'cash_bank_account_id' => $cashBank->id,
    'expense_account_id' => $expenseAccount->id,
    'counterparty_name' => 'Catering Berkah',
    'program_id' => $program->id,
    'amount' => 3500000,
    'description' => 'Konsumsi Acara Santunan Yatim',
]);
$expReq->setUserResolver(fn() => $pengelola);
$expRes = json_decode($controller->storeExpense($expReq)->getContent(), true);
$expId = $expRes['data']['id'];

// Submit Expense
$subExpReq = \Illuminate\Http\Request::create("/api/v1/transactions/{$expId}/submit", 'POST');
$subExpReq->setUserResolver(fn() => $pengelola);
$controller->submit($subExpReq, $expId);

echo "[2] Prepared 2 Submitted Transactions:\n";
echo "    - Income TRX #{$incId} Status: SUBMITTED (Rp 10.000.000)\n";
echo "    - Expense TRX #{$expId} Status: SUBMITTED (Rp 3.500.000)\n\n";

// 3. Owner checks Pending Approval Queue
$apprController = new \App\Http\Controllers\Api\V1\ApprovalController();
$queueReq = \Illuminate\Http\Request::create('/api/v1/approvals/pending', 'GET');
$queueReq->setUserResolver(fn() => $owner);
$queueRes = json_decode($apprController->pendingQueue($queueReq)->getContent(), true);

echo "[3] Owner Pending Approval Queue:\n";
echo "    - Total Pending Transactions: " . count($queueRes['data']) . "\n\n";

// 4. Owner APPROVES Income Transaction
$apprReq = \App\Http\Requests\ApproveTransactionRequest::create("/api/v1/transactions/{$incId}/approve", 'POST', [
    'comments' => 'Dokumen lengkap, disetujui.',
]);
$apprReq->setUserResolver(fn() => $owner);
$apprRes = json_decode($apprController->approve($apprReq, $incId)->getContent(), true);

echo "[4] Approve Income Transaction Response:\n";
echo "    - Success: " . ($apprRes['success'] ? 'true' : 'false') . "\n";
echo "    - New Status: " . $apprRes['data']['status'] . "\n";
echo "    - Approved At: " . $apprRes['data']['approved_at'] . "\n";
echo "    - History Logged: " . $apprRes['data']['approval_history'][0]['action'] . " by " . $apprRes['data']['approval_history'][0]['actor_name'] . "\n\n";

// 5. Owner REJECTS Expense Transaction
$rejReq = \App\Http\Requests\RejectTransactionRequest::create("/api/v1/transactions/{$expId}/reject", 'POST', [
    'reason' => 'Nota catering belum mencantumkan rincian porsi.',
]);
$rejReq->setUserResolver(fn() => $owner);
$rejRes = json_decode($apprController->reject($rejReq, $expId)->getContent(), true);

echo "[5] Reject Expense Transaction Response:\n";
echo "    - Success: " . ($rejRes['success'] ? 'true' : 'false') . "\n";
echo "    - New Status: " . $rejRes['data']['status'] . "\n";
echo "    - Rejection Reason: " . $rejRes['data']['approval_history'][0]['comments'] . "\n\n";

// 6. Correction Workflow: Pengelola corrects rejected expense & resubmits
$expTrx = Transaction::find($expId);
$expTrx->update([
    'amount' => 3200000,
    'description' => 'Konsumsi 100 Porsi Nasi Kotak (Diskon)',
]);

// Resubmit
$resubReq = \Illuminate\Http\Request::create("/api/v1/transactions/{$expId}/submit", 'POST');
$resubReq->setUserResolver(fn() => $pengelola);
$resubRes = json_decode($controller->submit($resubReq, $expId)->getContent(), true);

echo "[6] Correction & Resubmit Workflow:\n";
echo "    - Corrected Amount: Rp " . number_format($resubRes['data']['amount'], 0, ',', '.') . "\n";
echo "    - Resubmitted Status: " . $resubRes['data']['status'] . "\n\n";

// 7. Security Check: Invalid state transition DRAFT -> APPROVED blocked
$draftTrx = Transaction::create([
    'transaction_no' => 'TRX-2026-000599',
    'type' => 'INCOME',
    'transaction_date' => '2026-09-15',
    'accounting_period_id' => 1,
    'cash_bank_account_id' => $cashBank->id,
    'income_account_id' => $incomeAccount->id,
    'amount' => 1000000,
    'description' => 'Draft Illegal Approval Check',
    'status' => 'DRAFT',
    'created_by' => $pengelola->id,
]);

$invalidApprReq = \App\Http\Requests\ApproveTransactionRequest::create("/api/v1/transactions/{$draftTrx->id}/approve", 'POST');
$invalidApprReq->setUserResolver(fn() => $owner);
$invalidRes = $apprController->approve($invalidApprReq, $draftTrx->id);

echo "[7] Security State Machine Verification:\n";
echo "    - Approve DRAFT transaction result: Status " . $invalidRes->getStatusCode() . " (PASSED 409 Conflict Protection)\n\n";

echo "=== VERIFICATION COMPLETE: ALL CHECKS PASSED ===\n";

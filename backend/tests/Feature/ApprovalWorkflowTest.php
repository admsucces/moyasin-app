<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\CashBankAccount;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApprovalWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_owner_can_view_pending_approval_queue(): void
    {
        $owner = User::where('email', 'owner@yayasan.org')->first();
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();
        $period = AccountingPeriod::where('status', 'OPEN')->first();

        // Create a submitted transaction
        Transaction::create([
            'transaction_no' => 'TRX-2026-000500',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-15',
            'accounting_period_id' => $period->id,
            'cash_bank_account_id' => $cashBank->id,
            'income_account_id' => $incomeAccount->id,
            'amount' => 5000000,
            'description' => 'Pending Approval Test',
            'status' => 'SUBMITTED',
            'submitted_at' => now(),
            'created_by' => $pengelola->id,
        ]);

        $response = $this->actingAs($owner, 'sanctum')
                         ->getJson('/api/v1/approvals/pending');

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                 ])
                 ->assertJsonCount(1, 'data');
    }

    public function test_pengelola_cannot_view_pending_approval_queue(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->getJson('/api/v1/approvals/pending');

        $response->assertStatus(403);
    }

    public function test_owner_can_approve_submitted_transaction(): void
    {
        $owner = User::where('email', 'owner@yayasan.org')->first();
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();
        $period = AccountingPeriod::where('status', 'OPEN')->first();

        $transaction = Transaction::create([
            'transaction_no' => 'TRX-2026-000501',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-15',
            'accounting_period_id' => $period->id,
            'cash_bank_account_id' => $cashBank->id,
            'income_account_id' => $incomeAccount->id,
            'amount' => 2000000,
            'description' => 'Approve Test',
            'status' => 'SUBMITTED',
            'submitted_at' => now(),
            'created_by' => $pengelola->id,
        ]);

        $response = $this->actingAs($owner, 'sanctum')
                         ->postJson("/api/v1/transactions/{$transaction->id}/approve", [
                             'comments' => 'Dokumen lengkap & disetujui.',
                         ]);

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'data' => [
                         'status' => 'APPROVED',
                     ],
                 ]);

        $this->assertDatabaseHas('transactions', [
            'id' => $transaction->id,
            'status' => 'APPROVED',
        ]);

        $this->assertDatabaseHas('approvals', [
            'transaction_id' => $transaction->id,
            'action' => 'APPROVED',
            'actor_id' => $owner->id,
            'comments' => 'Dokumen lengkap & disetujui.',
        ]);
    }

    public function test_owner_can_reject_submitted_transaction_with_reason(): void
    {
        $owner = User::where('email', 'owner@yayasan.org')->first();
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $expenseAccount = Account::where('type', 'EXPENSE')->where('is_postable', true)->first();
        $period = AccountingPeriod::where('status', 'OPEN')->first();

        $transaction = Transaction::create([
            'transaction_no' => 'TRX-2026-000502',
            'type' => 'EXPENSE',
            'transaction_date' => '2026-09-15',
            'accounting_period_id' => $period->id,
            'cash_bank_account_id' => $cashBank->id,
            'expense_account_id' => $expenseAccount->id,
            'counterparty_name' => 'Vendor Struk',
            'amount' => 1500000,
            'description' => 'Reject Test',
            'status' => 'SUBMITTED',
            'submitted_at' => now(),
            'created_by' => $pengelola->id,
        ]);

        $response = $this->actingAs($owner, 'sanctum')
                         ->postJson("/api/v1/transactions/{$transaction->id}/reject", [
                             'reason' => 'Bukti kwitansi tidak jelas, mohon upload ulang.',
                         ]);

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'data' => [
                         'status' => 'REJECTED',
                     ],
                 ]);

        $this->assertDatabaseHas('transactions', [
            'id' => $transaction->id,
            'status' => 'REJECTED',
        ]);

        $this->assertDatabaseHas('approvals', [
            'transaction_id' => $transaction->id,
            'action' => 'REJECTED',
            'actor_id' => $owner->id,
            'comments' => 'Bukti kwitansi tidak jelas, mohon upload ulang.',
        ]);
    }

    public function test_reject_transaction_requires_reason(): void
    {
        $owner = User::where('email', 'owner@yayasan.org')->first();
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();
        $period = AccountingPeriod::where('status', 'OPEN')->first();

        $transaction = Transaction::create([
            'transaction_no' => 'TRX-2026-000503',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-15',
            'accounting_period_id' => $period->id,
            'cash_bank_account_id' => $cashBank->id,
            'income_account_id' => $incomeAccount->id,
            'amount' => 1000000,
            'description' => 'Reject No Reason Test',
            'status' => 'SUBMITTED',
            'submitted_at' => now(),
            'created_by' => $pengelola->id,
        ]);

        // Attempt rejection without mandatory 'reason'
        $response = $this->actingAs($owner, 'sanctum')
                         ->postJson("/api/v1/transactions/{$transaction->id}/reject", []);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['reason']);
    }

    public function test_cannot_approve_draft_transaction(): void
    {
        $owner = User::where('email', 'owner@yayasan.org')->first();
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();
        $period = AccountingPeriod::where('status', 'OPEN')->first();

        $transaction = Transaction::create([
            'transaction_no' => 'TRX-2026-000504',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-15',
            'accounting_period_id' => $period->id,
            'cash_bank_account_id' => $cashBank->id,
            'income_account_id' => $incomeAccount->id,
            'amount' => 1000000,
            'description' => 'Approve Draft Test',
            'status' => 'DRAFT',
            'created_by' => $pengelola->id,
        ]);

        // Attempting to approve a DRAFT transaction
        $response = $this->actingAs($owner, 'sanctum')
                         ->postJson("/api/v1/transactions/{$transaction->id}/approve");

        $response->assertStatus(409);
    }

    public function test_creator_can_edit_rejected_transaction_and_resubmit(): void
    {
        $owner = User::where('email', 'owner@yayasan.org')->first();
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();
        $period = AccountingPeriod::where('status', 'OPEN')->first();

        $transaction = Transaction::create([
            'transaction_no' => 'TRX-2026-000505',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-15',
            'accounting_period_id' => $period->id,
            'cash_bank_account_id' => $cashBank->id,
            'income_account_id' => $incomeAccount->id,
            'restriction_type' => 'WITHOUT_RESTRICTION',
            'amount' => 1000000,
            'description' => 'Original Description',
            'status' => 'REJECTED',
            'created_by' => $pengelola->id,
        ]);

        // 1. Creator updates rejected transaction
        $updateResponse = $this->actingAs($pengelola, 'sanctum')
                               ->putJson("/api/v1/transactions/income/{$transaction->id}", [
                                   'amount' => 1200000,
                                   'description' => 'Corrected Description',
                               ]);

        $updateResponse->assertStatus(200);

        // 2. Creator resubmits transaction
        $submitResponse = $this->actingAs($pengelola, 'sanctum')
                               ->postJson("/api/v1/transactions/{$transaction->id}/submit");

        $submitResponse->assertStatus(200)
                       ->assertJson([
                           'success' => true,
                           'data' => [
                               'status' => 'SUBMITTED',
                           ],
                       ]);

        $this->assertDatabaseHas('transactions', [
            'id' => $transaction->id,
            'status' => 'SUBMITTED',
            'amount' => 1200000,
        ]);
    }
}

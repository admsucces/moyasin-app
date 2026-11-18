<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\CashBankAccount;
use App\Models\Journal;
use App\Models\Program;
use App\Models\Transaction;
use App\Models\User;
use App\Services\PostingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReversalPeriodControlTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $pengelola;
    protected User $owner;
    protected AccountingPeriod $openPeriod;
    protected CashBankAccount $kasUtama;
    protected Account $accKas;
    protected Account $accDonasi;
    protected Account $accBeban;
    protected Program $programA;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->admin = User::where('email', 'admin@yayasan.org')->first();
        $this->pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $this->owner = User::where('email', 'owner@yayasan.org')->first();

        $this->openPeriod = AccountingPeriod::where('status', 'OPEN')->first();
        $this->kasUtama = CashBankAccount::first();
        $this->accKas = Account::where('id', $this->kasUtama->account_id)->first();
        $this->accDonasi = Account::where('type', 'INCOME')->where('is_postable', true)->first();
        $this->accBeban = Account::where('type', 'EXPENSE')->where('is_postable', true)->first();
        $this->programA = Program::first();
    }

    public function test_admin_can_reverse_posted_transaction()
    {
        // 1. Create, Approve, Post Income Transaction 5,000,000
        $trx = Transaction::create([
            'transaction_no' => 'TRX-REV-001',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-10',
            'accounting_period_id' => $this->openPeriod->id,
            'income_account_id' => $this->accDonasi->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'amount' => 5000000.00,
            'description' => 'Salah catat donasi',
            'status' => 'APPROVED',
            'created_by' => $this->pengelola->id,
        ]);
        PostingService::postTransaction($trx, $this->admin);

        // 2. Reverse as Admin
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/transactions/{$trx->id}/reverse", [
                'reason' => 'Salah memasukkan nominal dan akun donasi',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'REVERSED');

        $this->assertDatabaseHas('transactions', [
            'id' => $trx->id,
            'status' => 'REVERSED',
            'reversal_reason' => 'Salah memasukkan nominal dan akun donasi',
        ]);

        // Verify reversal journal entries (Debit Donasi, Credit Kas)
        $originalJournal = Journal::where('transaction_id', $trx->id)->firstOrFail();
        $reversalJournal = Journal::where('reversed_journal_id', $originalJournal->id)
            ->where('is_reversal', true)
            ->first();

        $this->assertNotNull($reversalJournal);
        $this->assertEquals('POSTED', $reversalJournal->status);
        $this->assertCount(2, $reversalJournal->entries);

        // Donasi entry (Debit = 5000000, Credit = 0)
        $this->assertDatabaseHas('journal_entries', [
            'journal_id' => $reversalJournal->id,
            'account_id' => $this->accDonasi->id,
            'debit' => 5000000.00,
            'credit' => 0.00,
        ]);

        // Kas entry (Debit = 0, Credit = 5000000)
        $this->assertDatabaseHas('journal_entries', [
            'journal_id' => $reversalJournal->id,
            'account_id' => $this->accKas->id,
            'debit' => 0.00,
            'credit' => 5000000.00,
        ]);
    }

    public function test_reversing_unposted_or_already_reversed_transaction_fails()
    {
        $draftTx = Transaction::create([
            'transaction_no' => 'TRX-REV-002',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-12',
            'accounting_period_id' => $this->openPeriod->id,
            'income_account_id' => $this->accDonasi->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'amount' => 1000000.00,
            'description' => 'Draft Transaction',
            'status' => 'DRAFT',
            'created_by' => $this->pengelola->id,
        ]);

        // Reverse draft -> 409
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/transactions/{$draftTx->id}/reverse", ['reason' => 'Reverse draft test'])
            ->assertStatus(409);

        // Reverse posted once -> success, reverse second time -> 409
        $postedTx = Transaction::create([
            'transaction_no' => 'TRX-REV-003',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-12',
            'accounting_period_id' => $this->openPeriod->id,
            'income_account_id' => $this->accDonasi->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'amount' => 1000000.00,
            'description' => 'Posted Transaction',
            'status' => 'APPROVED',
            'created_by' => $this->pengelola->id,
        ]);
        PostingService::postTransaction($postedTx, $this->admin);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/transactions/{$postedTx->id}/reverse", ['reason' => 'First reversal'])
            ->assertStatus(200);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/transactions/{$postedTx->id}/reverse", ['reason' => 'Second reversal'])
            ->assertStatus(409);
    }

    public function test_non_admin_cannot_reverse_transaction()
    {
        $postedTx = Transaction::create([
            'transaction_no' => 'TRX-REV-004',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-12',
            'accounting_period_id' => $this->openPeriod->id,
            'income_account_id' => $this->accDonasi->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'amount' => 1000000.00,
            'description' => 'Posted Transaction',
            'status' => 'APPROVED',
            'created_by' => $this->pengelola->id,
        ]);
        PostingService::postTransaction($postedTx, $this->admin);

        $this->actingAs($this->pengelola, 'sanctum')
            ->postJson("/api/v1/transactions/{$postedTx->id}/reverse", ['reason' => 'Attempt by pengelola'])
            ->assertStatus(403);
    }

    public function test_admin_can_close_period_without_pending_transactions()
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/accounting-periods/{$this->openPeriod->id}/close");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'CLOSED');

        $this->assertDatabaseHas('accounting_periods', [
            'id' => $this->openPeriod->id,
            'status' => 'CLOSED',
        ]);
    }

    public function test_closing_period_with_pending_transactions_fails()
    {
        // Create draft transaction in open period
        Transaction::create([
            'transaction_no' => 'TRX-PENDING-001',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-15',
            'accounting_period_id' => $this->openPeriod->id,
            'income_account_id' => $this->accDonasi->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'amount' => 500000.00,
            'description' => 'Pending Draft',
            'status' => 'DRAFT',
            'created_by' => $this->pengelola->id,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/accounting-periods/{$this->openPeriod->id}/close");

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['period']);
    }

    public function test_owner_can_reopen_closed_period()
    {
        // Close period first
        $this->openPeriod->update(['status' => 'CLOSED', 'closed_at' => now(), 'closed_by' => $this->admin->id]);

        // Request reopen by admin
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/accounting-periods/{$this->openPeriod->id}/reopen-request", [
                'reason' => 'Perlu penyesuaian akhir tahun',
            ])->assertStatus(200);

        // Approve reopen by owner
        $response = $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/v1/accounting-periods/{$this->openPeriod->id}/reopen", [
                'reason' => 'Disetujui untuk penyesuaian',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'OPEN');

        $this->assertDatabaseHas('accounting_periods', [
            'id' => $this->openPeriod->id,
            'status' => 'OPEN',
        ]);
    }
}

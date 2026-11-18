<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\CashBankAccount;
use App\Models\Journal;
use App\Models\Program;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountingPostingEngineTest extends TestCase
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

    public function test_admin_can_post_approved_income_transaction()
    {
        $transaction = Transaction::create([
            'transaction_no' => 'TRX-2026-000001',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-15',
            'accounting_period_id' => $this->openPeriod->id,
            'income_account_id' => $this->accDonasi->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'program_id' => $this->programA->id,
            'amount' => 5000000.00,
            'description' => 'Donasi Beasiswa',
            'status' => 'APPROVED',
            'created_by' => $this->pengelola->id,
            'approved_by' => $this->owner->id,
            'approved_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/transactions/{$transaction->id}/post");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'POSTED')
            ->assertJsonPath('data.journal.journal_no', 'JRN-2026-000001');

        $this->assertDatabaseHas('transactions', [
            'id' => $transaction->id,
            'status' => 'POSTED',
        ]);

        $journal = Journal::where('transaction_id', $transaction->id)->first();
        $this->assertNotNull($journal);
        $this->assertEquals('POSTED', $journal->status);
        $this->assertCount(2, $journal->entries);

        // Kas entry (Debit = 5000000, Credit = 0)
        $this->assertDatabaseHas('journal_entries', [
            'journal_id' => $journal->id,
            'account_id' => $this->accKas->id,
            'debit' => 5000000.00,
            'credit' => 0.00,
        ]);

        // Donasi entry (Debit = 0, Credit = 5000000)
        $this->assertDatabaseHas('journal_entries', [
            'journal_id' => $journal->id,
            'account_id' => $this->accDonasi->id,
            'debit' => 0.00,
            'credit' => 5000000.00,
        ]);
    }

    public function test_admin_can_post_approved_expense_transaction()
    {
        $transaction = Transaction::create([
            'transaction_no' => 'TRX-2026-000002',
            'type' => 'EXPENSE',
            'transaction_date' => '2026-09-16',
            'accounting_period_id' => $this->openPeriod->id,
            'expense_account_id' => $this->accBeban->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'program_id' => $this->programA->id,
            'amount' => 1500000.00,
            'description' => 'Pembelian Alat Tulis',
            'status' => 'APPROVED',
            'created_by' => $this->pengelola->id,
            'approved_by' => $this->owner->id,
            'approved_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/transactions/{$transaction->id}/post");

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $journal = Journal::where('transaction_id', $transaction->id)->first();

        // Beban entry (Debit = 1500000, Credit = 0)
        $this->assertDatabaseHas('journal_entries', [
            'journal_id' => $journal->id,
            'account_id' => $this->accBeban->id,
            'debit' => 1500000.00,
            'credit' => 0.00,
        ]);

        // Kas entry (Debit = 0, Credit = 1500000)
        $this->assertDatabaseHas('journal_entries', [
            'journal_id' => $journal->id,
            'account_id' => $this->accKas->id,
            'debit' => 0.00,
            'credit' => 1500000.00,
        ]);
    }

    public function test_posting_unapproved_or_posted_transaction_fails()
    {
        $postedTx = Transaction::create([
            'transaction_no' => 'TRX-2026-000003',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-17',
            'accounting_period_id' => $this->openPeriod->id,
            'income_account_id' => $this->accDonasi->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'amount' => 1000000.00,
            'description' => 'Draft Donasi',
            'status' => 'POSTED',
            'created_by' => $this->pengelola->id,
        ]);

        // Attempt post already posted -> 409
        $res1 = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/transactions/{$postedTx->id}/post");
        $res1->assertStatus(409);

        $approvedTx = Transaction::create([
            'transaction_no' => 'TRX-2026-000004',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-18',
            'accounting_period_id' => $this->openPeriod->id,
            'income_account_id' => $this->accDonasi->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'amount' => 1000000.00,
            'description' => 'Approved Donasi',
            'status' => 'APPROVED',
            'created_by' => $this->pengelola->id,
        ]);

        // Post once -> success
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/transactions/{$approvedTx->id}/post")
            ->assertStatus(200);

        // Attempt post twice -> 409
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/transactions/{$approvedTx->id}/post")
            ->assertStatus(409);
    }

    public function test_non_admin_cannot_post_transaction()
    {
        $transaction = Transaction::create([
            'transaction_no' => 'TRX-2026-000005',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-19',
            'accounting_period_id' => $this->openPeriod->id,
            'income_account_id' => $this->accDonasi->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'amount' => 1000000.00,
            'description' => 'Donasi Non-Admin',
            'status' => 'APPROVED',
            'created_by' => $this->pengelola->id,
        ]);

        $this->actingAs($this->pengelola, 'sanctum')
            ->postJson("/api/v1/transactions/{$transaction->id}/post")
            ->assertStatus(403);
    }

    public function test_admin_can_create_balanced_manual_journal()
    {
        $payload = [
            'journal_date' => '2026-09-20',
            'description' => 'Jurnal penyesuaian saldo awal kas',
            'entries' => [
                [
                    'account_id' => $this->accKas->id,
                    'debit' => 2000000.00,
                    'credit' => 0.00,
                    'description' => 'Debit Kas',
                ],
                [
                    'account_id' => $this->accDonasi->id,
                    'debit' => 0.00,
                    'credit' => 2000000.00,
                    'description' => 'Kredit Donasi',
                ],
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/journals', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'POSTED');

        $this->assertDatabaseHas('journals', [
            'description' => 'Jurnal penyesuaian saldo awal kas',
            'status' => 'POSTED',
        ]);
    }

    public function test_creating_unbalanced_manual_journal_fails_validation()
    {
        $payload = [
            'journal_date' => '2026-09-20',
            'description' => 'Jurnal tidak seimbang',
            'entries' => [
                [
                    'account_id' => $this->accKas->id,
                    'debit' => 2000000.00,
                    'credit' => 0.00,
                ],
                [
                    'account_id' => $this->accDonasi->id,
                    'debit' => 0.00,
                    'credit' => 1500000.00,
                ],
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/journals', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['entries']);
    }

    public function test_authenticated_user_can_list_and_view_journals()
    {
        // Create manual journal first
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/journals', [
                'journal_date' => '2026-09-20',
                'description' => 'Jurnal Manual 1',
                'entries' => [
                    ['account_id' => $this->accKas->id, 'debit' => 500000.00, 'credit' => 0.00],
                    ['account_id' => $this->accDonasi->id, 'debit' => 0.00, 'credit' => 500000.00],
                ],
            ]);

        $listRes = $this->actingAs($this->pengelola, 'sanctum')
            ->getJson('/api/v1/journals');

        $listRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $journalId = $listRes->json('data.0.id');

        $showRes = $this->actingAs($this->pengelola, 'sanctum')
            ->getJson("/api/v1/journals/{$journalId}");

        $showRes->assertStatus(200)
            ->assertJsonPath('data.id', $journalId);
    }
}

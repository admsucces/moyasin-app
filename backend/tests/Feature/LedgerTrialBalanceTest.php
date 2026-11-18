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

class LedgerTrialBalanceTest extends TestCase
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

    public function test_ledger_only_includes_posted_journals()
    {
        // 1. Create a DRAFT transaction
        $draftTx = Transaction::create([
            'transaction_no' => 'TRX-DRAFT-001',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-10',
            'accounting_period_id' => $this->openPeriod->id,
            'income_account_id' => $this->accDonasi->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'amount' => 10000000.00,
            'description' => 'Unposted Draft Transaction',
            'status' => 'DRAFT',
            'created_by' => $this->pengelola->id,
        ]);

        // Query ledger for Kas account
        $res = $this->actingAs($this->pengelola, 'sanctum')
            ->getJson("/api/v1/accounting/ledger?account_id={$this->accKas->id}");

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.closing_balance', 0)
            ->assertJsonCount(0, 'data.entries');
    }

    public function test_ledger_calculates_opening_running_closing_balances_correctly_for_debit_account()
    {
        // Post Income 1: +5,000,000 to Kas on 2026-09-05
        $trx1 = Transaction::create([
            'transaction_no' => 'TRX-2026-09001',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-05',
            'accounting_period_id' => $this->openPeriod->id,
            'income_account_id' => $this->accDonasi->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'program_id' => $this->programA->id,
            'amount' => 5000000.00,
            'description' => 'Donasi Yatim 1',
            'status' => 'APPROVED',
            'created_by' => $this->pengelola->id,
        ]);
        PostingService::postTransaction($trx1, $this->admin);

        // Post Expense 1: -2,000,000 from Kas on 2026-09-15
        $trx2 = Transaction::create([
            'transaction_no' => 'TRX-2026-09002',
            'type' => 'EXPENSE',
            'transaction_date' => '2026-09-15',
            'accounting_period_id' => $this->openPeriod->id,
            'expense_account_id' => $this->accBeban->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'program_id' => $this->programA->id,
            'amount' => 2000000.00,
            'description' => 'Beban Yatim 1',
            'status' => 'APPROVED',
            'created_by' => $this->pengelola->id,
        ]);
        PostingService::postTransaction($trx2, $this->admin);

        // Request Ledger for Kas account with date_from=2026-09-10 to 2026-09-20
        $res = $this->actingAs($this->pengelola, 'sanctum')
            ->getJson("/api/v1/accounting/ledger?account_id={$this->accKas->id}&date_from=2026-09-10&date_to=2026-09-20");

        $res->assertStatus(200)
            ->assertJsonPath('success', true);

        $data = $res->json('data');
        $this->assertEquals(5000000.00, $data['opening_balance']);
        $this->assertEquals(0.00, $data['total_period_debit']);
        $this->assertEquals(2000000.00, $data['total_period_credit']);
        $this->assertEquals(3000000.00, $data['closing_balance']);
    }

    public function test_ledger_calculates_running_balance_correctly_for_credit_account()
    {
        // Post Income 1: +5,000,000 to Donasi (CREDIT normal balance)
        $trx1 = Transaction::create([
            'transaction_no' => 'TRX-2026-09003',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-10',
            'accounting_period_id' => $this->openPeriod->id,
            'income_account_id' => $this->accDonasi->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'amount' => 5000000.00,
            'description' => 'Penerimaan Donasi',
            'status' => 'APPROVED',
            'created_by' => $this->pengelola->id,
        ]);
        PostingService::postTransaction($trx1, $this->admin);

        $res = $this->actingAs($this->pengelola, 'sanctum')
            ->getJson("/api/v1/accounting/ledger?account_id={$this->accDonasi->id}");

        $res->assertStatus(200)
            ->assertJsonPath('success', true);

        $data = $res->json('data');
        $this->assertEquals(5000000.00, $data['closing_balance']);
        $this->assertEquals(5000000.00, $data['entries'][0]['credit']);
        $this->assertEquals(5000000.00, $data['entries'][0]['running_balance']);
    }

    public function test_trial_balance_is_balanced_and_matches_posted_journals()
    {
        // Post Income: +10,000,000
        $trx1 = Transaction::create([
            'transaction_no' => 'TRX-2026-09004',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-12',
            'accounting_period_id' => $this->openPeriod->id,
            'income_account_id' => $this->accDonasi->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'amount' => 10000000.00,
            'description' => 'Penerimaan ZIS',
            'status' => 'APPROVED',
            'created_by' => $this->pengelola->id,
        ]);
        PostingService::postTransaction($trx1, $this->admin);

        // Post Expense: +4,000,000
        $trx2 = Transaction::create([
            'transaction_no' => 'TRX-2026-09005',
            'type' => 'EXPENSE',
            'transaction_date' => '2026-09-14',
            'accounting_period_id' => $this->openPeriod->id,
            'expense_account_id' => $this->accBeban->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'amount' => 4000000.00,
            'description' => 'Beban Operasional',
            'status' => 'APPROVED',
            'created_by' => $this->pengelola->id,
        ]);
        PostingService::postTransaction($trx2, $this->admin);

        // Fetch Trial Balance
        $res = $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/accounting/trial-balance');

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.summary.is_balanced', true)
            ->assertJsonPath('data.summary.difference', 0);

        $summary = $res->json('data.summary');
        $this->assertEquals($summary['total_ending_debit'], $summary['total_ending_credit']);
        $this->assertEquals(10000000.00, $summary['total_ending_debit']); // Kas 6M + Beban 4M = 10M, Donasi 10M
    }

    public function test_sub_ledger_filters_by_donor_and_program_correctly()
    {
        $donor = \App\Models\Donor::create([
            'donor_code' => 'DNR-TEST-001',
            'name' => 'PT Mitra Sejahtera',
            'type' => 'INSTITUTION',
            'email' => 'mitra@test.com',
            'phone' => '08123456789',
        ]);

        $trxnn = Transaction::create([
            'transaction_no' => 'TRX-SUB-001',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-18',
            'accounting_period_id' => $this->openPeriod->id,
            'income_account_id' => $this->accDonasi->id,
            'cash_bank_account_id' => $this->kasUtama->id,
            'program_id' => $this->programA->id,
            'donor_id' => $donor->id,
            'amount' => 7500000.00,
            'description' => 'Donasi Kemitraan',
            'status' => 'APPROVED',
            'created_by' => $this->pengelola->id,
        ]);
        PostingService::postTransaction($trxnn, $this->admin);

        $res = $this->actingAs($this->pengelola, 'sanctum')
            ->getJson("/api/v1/accounting/sub-ledger?donor_id={$donor->id}&account_id={$this->accKas->id}");

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.closing_balance', 7500000)
            ->assertJsonCount(1, 'data.entries');
    }
}

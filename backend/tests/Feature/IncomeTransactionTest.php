<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\CashBankAccount;
use App\Models\Donor;
use App\Models\Program;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IncomeTransactionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_pengelola_can_create_income_transaction_draft(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();
        $program = Program::first();
        $donor = Donor::first();

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->postJson('/api/v1/transactions/income', [
                             'transaction_date' => '2026-09-15',
                             'cash_bank_account_id' => $cashBank->id,
                             'income_account_id' => $incomeAccount->id,
                             'donor_id' => $donor->id,
                             'program_id' => $program->id,
                             'restriction_type' => 'WITH_RESTRICTION',
                             'amount' => 5000000,
                             'description' => 'Penerimaan Donasi Program Pendidikan Sept 2026',
                         ]);

        $response->assertStatus(201)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Transaksi penerimaan berhasil dicatat dan diposting (POSTED).',
                     'data' => [
                         'type' => 'INCOME',
                         'amount' => '5000000.00',
                         'status' => 'POSTED',
                         'restriction_type' => 'WITH_RESTRICTION',
                     ],
                 ]);

        $this->assertDatabaseHas('transactions', [
            'type' => 'INCOME',
            'amount' => 5000000,
            'status' => 'POSTED',
            'created_by' => $pengelola->id,
        ]);
    }

    public function test_income_creation_validates_open_accounting_period(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();

        // Transaction date outside the seeded OPEN period (2026-09-01 to 2026-09-30)
        $response = $this->actingAs($pengelola, 'sanctum')
                         ->postJson('/api/v1/transactions/income', [
                             'transaction_date' => '2025-01-15',
                             'cash_bank_account_id' => $cashBank->id,
                             'income_account_id' => $incomeAccount->id,
                             'restriction_type' => 'WITHOUT_RESTRICTION',
                             'amount' => 1000000,
                             'description' => 'Penerimaan Luar Periode',
                         ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['transaction_date']);
    }

    public function test_income_creation_validates_positive_amount(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->postJson('/api/v1/transactions/income', [
                             'transaction_date' => '2026-09-15',
                             'cash_bank_account_id' => $cashBank->id,
                             'income_account_id' => $incomeAccount->id,
                             'restriction_type' => 'WITHOUT_RESTRICTION',
                             'amount' => -50000,
                             'description' => 'Nominal negatif',
                         ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['amount']);
    }

    public function test_pengelola_can_update_own_draft_income(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();
        $period = AccountingPeriod::where('status', 'OPEN')->first();

        $transaction = Transaction::create([
            'transaction_no' => 'TRX-2026-000099',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-15',
            'accounting_period_id' => $period->id,
            'cash_bank_account_id' => $cashBank->id,
            'income_account_id' => $incomeAccount->id,
            'restriction_type' => 'WITHOUT_RESTRICTION',
            'amount' => 1000000,
            'description' => 'Keterangan awal',
            'status' => 'DRAFT',
            'created_by' => $pengelola->id,
        ]);

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->putJson("/api/v1/transactions/income/{$transaction->id}", [
                             'amount' => 2500000,
                             'description' => 'Keterangan revisi',
                         ]);

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'data' => [
                         'amount' => '2500000.00',
                         'description' => 'Keterangan revisi',
                     ],
                 ]);

        $this->assertDatabaseHas('transactions', [
            'id' => $transaction->id,
            'amount' => 2500000,
            'description' => 'Keterangan revisi',
        ]);
    }

    public function test_pengelola_can_submit_draft_income(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();
        $period = AccountingPeriod::where('status', 'OPEN')->first();

        $transaction = Transaction::create([
            'transaction_no' => 'TRX-2026-000100',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-15',
            'accounting_period_id' => $period->id,
            'cash_bank_account_id' => $cashBank->id,
            'income_account_id' => $incomeAccount->id,
            'restriction_type' => 'WITH_RESTRICTION',
            'amount' => 3000000,
            'description' => 'Pengajuan donasi',
            'status' => 'DRAFT',
            'created_by' => $pengelola->id,
        ]);

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->postJson("/api/v1/transactions/{$transaction->id}/submit");

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'data' => [
                         'status' => 'SUBMITTED',
                     ],
                 ]);

        $this->assertDatabaseHas('transactions', [
            'id' => $transaction->id,
            'status' => 'SUBMITTED',
        ]);
    }

    public function test_owner_cannot_create_income(): void
    {
        $owner = User::where('email', 'owner@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();

        $response = $this->actingAs($owner, 'sanctum')
                         ->postJson('/api/v1/transactions/income', [
                             'transaction_date' => '2026-09-15',
                             'cash_bank_account_id' => $cashBank->id,
                             'income_account_id' => $incomeAccount->id,
                             'restriction_type' => 'WITHOUT_RESTRICTION',
                             'amount' => 500000,
                             'description' => 'Unauthorized income creation',
                         ]);

        $response->assertStatus(403);
    }
}

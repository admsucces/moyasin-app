<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\CashBankAccount;
use App\Models\Program;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseTransactionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_pengelola_can_create_expense_transaction_draft(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $expenseAccount = Account::where('type', 'EXPENSE')->where('is_postable', true)->first();
        $program = Program::first();

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->postJson('/api/v1/transactions/expense', [
                             'transaction_date' => '2026-09-15',
                             'cash_bank_account_id' => $cashBank->id,
                             'expense_account_id' => $expenseAccount->id,
                             'counterparty_name' => 'Toko Alat Tulis Bintang',
                             'program_id' => $program->id,
                             'amount' => 1250000,
                             'description' => 'Pembelian Alat Tulis & Perlengkapan Belajar Yatim',
                         ]);

        $response->assertStatus(201)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Transaksi pengeluaran berhasil dicatat dan diposting (POSTED).',
                     'data' => [
                         'type' => 'EXPENSE',
                         'amount' => '1250000.00',
                         'status' => 'POSTED',
                         'counterparty_name' => 'Toko Alat Tulis Bintang',
                     ],
                 ]);

        $this->assertDatabaseHas('transactions', [
            'type' => 'EXPENSE',
            'amount' => 1250000,
            'counterparty_name' => 'Toko Alat Tulis Bintang',
            'status' => 'POSTED',
            'created_by' => $pengelola->id,
        ]);
    }

    public function test_expense_creation_validates_open_accounting_period(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $expenseAccount = Account::where('type', 'EXPENSE')->where('is_postable', true)->first();

        // Date outside seeded OPEN period
        $response = $this->actingAs($pengelola, 'sanctum')
                         ->postJson('/api/v1/transactions/expense', [
                             'transaction_date' => '2025-01-15',
                             'cash_bank_account_id' => $cashBank->id,
                             'expense_account_id' => $expenseAccount->id,
                             'counterparty_name' => 'Vendor Test',
                             'amount' => 500000,
                             'description' => 'Pengeluaran Luar Periode',
                         ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['transaction_date']);
    }

    public function test_expense_creation_validates_counterparty_name(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $expenseAccount = Account::where('type', 'EXPENSE')->where('is_postable', true)->first();

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->postJson('/api/v1/transactions/expense', [
                             'transaction_date' => '2026-09-15',
                             'cash_bank_account_id' => $cashBank->id,
                             'expense_account_id' => $expenseAccount->id,
                             // Missing counterparty_name
                             'amount' => 500000,
                             'description' => 'Tanpa Nama Penerima',
                         ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['counterparty_name']);
    }

    public function test_expense_creation_validates_active_expense_account(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        // Use an INCOME account for expense endpoint -> should trigger type validation
        $incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->postJson('/api/v1/transactions/expense', [
                             'transaction_date' => '2026-09-15',
                             'cash_bank_account_id' => $cashBank->id,
                             'expense_account_id' => $incomeAccount->id,
                             'counterparty_name' => 'Toko Buku',
                             'amount' => 500000,
                             'description' => 'Salah Akun',
                         ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['expense_account_id']);
    }

    public function test_pengelola_can_update_own_draft_expense(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $expenseAccount = Account::where('type', 'EXPENSE')->where('is_postable', true)->first();
        $period = AccountingPeriod::where('status', 'OPEN')->first();

        $transaction = Transaction::create([
            'transaction_no' => 'TRX-2026-000300',
            'type' => 'EXPENSE',
            'transaction_date' => '2026-09-15',
            'accounting_period_id' => $period->id,
            'cash_bank_account_id' => $cashBank->id,
            'expense_account_id' => $expenseAccount->id,
            'counterparty_name' => 'Toko Awal',
            'amount' => 500000,
            'description' => 'Beban Operasional Awal',
            'status' => 'DRAFT',
            'created_by' => $pengelola->id,
        ]);

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->putJson("/api/v1/transactions/expense/{$transaction->id}", [
                             'counterparty_name' => 'Toko Revisi Utama',
                             'amount' => 750000,
                             'description' => 'Beban Operasional Revisi',
                         ]);

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'data' => [
                         'amount' => '750000.00',
                         'counterparty_name' => 'Toko Revisi Utama',
                     ],
                 ]);

        $this->assertDatabaseHas('transactions', [
            'id' => $transaction->id,
            'amount' => 750000,
            'counterparty_name' => 'Toko Revisi Utama',
        ]);
    }

    public function test_pengelola_can_submit_draft_expense(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $expenseAccount = Account::where('type', 'EXPENSE')->where('is_postable', true)->first();
        $period = AccountingPeriod::where('status', 'OPEN')->first();

        $transaction = Transaction::create([
            'transaction_no' => 'TRX-2026-000301',
            'type' => 'EXPENSE',
            'transaction_date' => '2026-09-15',
            'accounting_period_id' => $period->id,
            'cash_bank_account_id' => $cashBank->id,
            'expense_account_id' => $expenseAccount->id,
            'counterparty_name' => 'Pln Distribusi',
            'amount' => 1500000,
            'description' => 'Tagihan Listrik Kantor Sept 2026',
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

    public function test_owner_cannot_create_expense(): void
    {
        $owner = User::where('email', 'owner@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $expenseAccount = Account::where('type', 'EXPENSE')->where('is_postable', true)->first();

        $response = $this->actingAs($owner, 'sanctum')
                         ->postJson('/api/v1/transactions/expense', [
                             'transaction_date' => '2026-09-15',
                             'cash_bank_account_id' => $cashBank->id,
                             'expense_account_id' => $expenseAccount->id,
                             'counterparty_name' => 'Unauthorized Expense',
                             'amount' => 500000,
                             'description' => 'Unauthorized creation',
                         ]);

        $response->assertStatus(403);
    }
}

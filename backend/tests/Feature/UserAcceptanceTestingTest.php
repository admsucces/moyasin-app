<?php

namespace Tests\Feature;

use App\Models\AccountingPeriod;
use App\Models\Account;
use App\Models\CashBankAccount;
use App\Models\Program;
use App\Models\Role;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserAcceptanceTestingTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $pengelola;
    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $adminRole = Role::create(['code' => 'ADMIN', 'name' => 'Administrator']);
        $pengelolaRole = Role::create(['code' => 'PENGELOLA', 'name' => 'Pengelola Keuangan']);
        $ownerRole = Role::create(['code' => 'OWNER', 'name' => 'Pengurus / Owner']);

        $this->admin = User::create([
            'name' => 'UAT Admin',
            'email' => 'uat_admin@example.com',
            'password' => Hash::make('password123'),
            'role_id' => $adminRole->id,
            'status' => 'ACTIVE',
        ]);

        $this->pengelola = User::create([
            'name' => 'UAT Pengelola',
            'email' => 'uat_pengelola@example.com',
            'password' => Hash::make('password123'),
            'role_id' => $pengelolaRole->id,
            'status' => 'ACTIVE',
        ]);

        $this->owner = User::create([
            'name' => 'UAT Owner',
            'email' => 'uat_owner@example.com',
            'password' => Hash::make('password123'),
            'role_id' => $ownerRole->id,
            'status' => 'ACTIVE',
        ]);

        AccountingPeriod::create([
            'name' => 'September 2026',
            'start_date' => '2026-09-01',
            'end_date' => '2026-09-30',
            'status' => 'OPEN',
        ]);
    }

    public function test_uat_end_to_end_multi_role_workflow(): void
    {
        // -------------------------------------------------------------
        // ACTOR 1: PENGELOLA — Create & Submit Income Transaction
        // -------------------------------------------------------------
        Sanctum::actingAs($this->pengelola);

        $kasAccount = Account::create([
            'code' => '1001',
            'name' => 'Kas Utama',
            'type' => 'ASSET',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
            'is_postable' => true,
        ]);

        $cashBank = CashBankAccount::create([
            'account_id' => $kasAccount->id,
            'type' => 'CASH',
            'name' => 'Kas Operasional',
            'is_active' => true,
        ]);

        $incomeAccount = Account::create([
            'code' => '4001',
            'name' => 'Penerimaan Donasi Yatim',
            'type' => 'REVENUE',
            'normal_balance' => 'CREDIT',
            'is_active' => true,
            'is_postable' => true,
        ]);

        $program = Program::create([
            'code' => 'PRG-YATIM',
            'name' => 'Program Santunan Yatim',
            'is_active' => true,
        ]);

        // Pengelola creates Income draft
        $createResponse = $this->postJson('/api/v1/transactions/income', [
            'transaction_date' => '2026-09-24',
            'description' => 'Donasi harian hamba Allah',
            'amount' => 5000000,
            'cash_bank_account_id' => $cashBank->id,
            'income_account_id' => $incomeAccount->id,
            'program_id' => $program->id,
            'restriction_type' => 'WITHOUT_RESTRICTION',
        ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('data.status', 'POSTED');
        $transactionId = $createResponse->json('data.id');

        // -------------------------------------------------------------
        // ACTOR 3: ADMIN — Verify Ledger & Financial Reports
        // -------------------------------------------------------------
        Sanctum::actingAs($this->admin);

        // Admin verifies Ledger
        $ledgerResponse = $this->getJson("/api/v1/accounting/ledger?account_id={$kasAccount->id}");

        $ledgerResponse->assertStatus(200)
            ->assertJsonPath('data.account.code', '1001');

        // Admin verifies Trial Balance (balanced debit and credit)
        $tbResponse = $this->getJson('/api/v1/accounting/trial-balance');

        $tbResponse->assertStatus(200)
            ->assertJsonPath('data.summary.is_balanced', true);

        // Admin checks Audit Trail
        $auditResponse = $this->getJson('/api/v1/audit-logs');

        $auditResponse->assertStatus(200);

        // Admin exports financial report
        $exportResponse = $this->getJson('/api/v1/export/reports/trial-balance');

        $exportResponse->assertStatus(200);
    }
}

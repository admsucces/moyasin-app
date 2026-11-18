<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\CashBankAccount;
use App\Models\Donor;
use App\Models\Program;
use App\Models\Role;
use App\Models\Transaction;
use App\Models\User;
use App\Services\PostingService;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $pengelola;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\AccountSeeder::class);
        $this->seed(\Database\Seeders\AccountingPeriodSeeder::class);
        $this->seed(\Database\Seeders\ProgramSeeder::class);
        $this->seed(\Database\Seeders\DonorSeeder::class);

        $adminRole = Role::where('code', 'ADMIN')->first();
        $pengelolaRole = Role::where('code', 'PENGELOLA')->first();

        $this->admin = User::create([
            'username' => 'auditadmin',
            'name' => 'Audit Admin',
            'email' => 'auditadmin@example.com',
            'password' => bcrypt('password123'),
            'role_id' => $adminRole->id,
            'is_active' => true,
        ]);

        $this->pengelola = User::create([
            'username' => 'auditpengelola',
            'name' => 'Audit Pengelola',
            'email' => 'auditpengelola@example.com',
            'password' => bcrypt('password123'),
            'role_id' => $pengelolaRole->id,
            'is_active' => true,
        ]);
    }

    public function test_audit_log_recorded_when_transaction_created_and_posted()
    {
        $period = AccountingPeriod::where('status', 'OPEN')->first();
        $cashAcc = CashBankAccount::first();
        $incomeAcc = Account::where('code', '4101')->first();

        // 1. Create Income Transaction
        $res = $this->actingAs($this->pengelola, 'sanctum')
            ->postJson('/api/v1/transactions/income', [
                'transaction_date' => date('Y-m-d'),
                'cash_bank_account_id' => $cashAcc->id,
                'income_account_id' => $incomeAcc->id,
                'restriction_type' => 'WITHOUT_RESTRICTION',
                'amount' => 1000000,
                'description' => 'Audit Log Test Income',
            ]);

        $res->assertStatus(201);
        $trxId = $res->json('data.id');

        // Check Audit Log entry created
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'TRANSACTION_POSTED',
            'entity_type' => 'Transaction',
            'entity_id' => $trxId,
            'user_id' => $this->pengelola->id,
        ]);
    }

    public function test_admin_and_owner_can_access_audit_logs_endpoint()
    {
        $res = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/audit-logs');

        $res->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    public function test_pengelola_is_forbidden_from_audit_logs()
    {
        $res = $this->actingAs($this->pengelola, 'sanctum')
            ->getJson('/api/v1/audit-logs');

        $res->assertStatus(403);
    }
}

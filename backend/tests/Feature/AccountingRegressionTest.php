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
use App\Services\FinancialReportService;
use App\Services\PostingService;
use App\Services\ReversalService;
use App\Services\TrialBalanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountingRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $pengelola;
    protected User $owner;

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
        $ownerRole = Role::where('code', 'OWNER')->first();

        $this->admin = User::create([
            'username' => 'regadmin',
            'name' => 'Regression Admin',
            'email' => 'regadmin@example.com',
            'password' => bcrypt('password123'),
            'role_id' => $adminRole->id,
            'is_active' => true,
        ]);

        $this->pengelola = User::create([
            'username' => 'regpengelola',
            'name' => 'Regression Pengelola',
            'email' => 'regpengelola@example.com',
            'password' => bcrypt('password123'),
            'role_id' => $pengelolaRole->id,
            'is_active' => true,
        ]);

        $this->owner = User::create([
            'username' => 'regowner',
            'name' => 'Regression Owner',
            'email' => 'regowner@example.com',
            'password' => bcrypt('password123'),
            'role_id' => $ownerRole->id,
            'is_active' => true,
        ]);
    }

    public function test_full_end_to_end_accounting_lifecycle()
    {
        $period = AccountingPeriod::where('status', 'OPEN')->first();
        $program = Program::first();
        $donor = Donor::first();
        $cashAcc = CashBankAccount::first();
        $incomeAcc = Account::where('code', '4101')->first();
        $expenseAcc = Account::where('code', '5101')->first();

        // Step 1: Create Income Transaction (DRAFT)
        $incomeTx = Transaction::create([
            'transaction_no' => 'INC-REG-001',
            'type' => 'INCOME',
            'transaction_date' => date('Y-m-d'),
            'accounting_period_id' => $period->id,
            'program_id' => $program->id,
            'donor_id' => $donor->id,
            'cash_bank_account_id' => $cashAcc->id,
            'income_account_id' => $incomeAcc->id,
            'restriction_type' => 'WITH_RESTRICTION',
            'amount' => 10000000.00,
            'description' => 'E2E Lifecycle Income Test',
            'status' => 'DRAFT',
            'created_by' => $this->pengelola->id,
        ]);
        $this->assertEquals('DRAFT', $incomeTx->status);

        // Step 2: Submit Transaction
        $incomeTx->update(['status' => 'SUBMITTED', 'submitted_at' => now()]);
        $this->assertEquals('SUBMITTED', $incomeTx->status);

        // Step 3: Owner Approve
        $incomeTx->update(['status' => 'APPROVED', 'approved_at' => now()]);
        $this->assertEquals('APPROVED', $incomeTx->status);

        // Step 4: Admin Post
        $journal = PostingService::postTransaction($incomeTx, $this->admin);
        $this->assertEquals('POSTED', $incomeTx->fresh()->status);
        $this->assertEquals('POSTED', $journal->status);
        $this->assertCount(2, $journal->entries);

        // Step 5: Verify Trial Balance is balanced
        $tb = TrialBalanceService::getTrialBalance(date('Y-01-01'), date('Y-m-d'));
        $this->assertTrue($tb['summary']['is_balanced']);

        // Step 6: Verify Balance Sheet is balanced
        $bs = FinancialReportService::getBalanceSheet(date('Y-m-d'));
        $this->assertTrue($bs['is_balanced']);
        $this->assertEquals(10000000.00, $bs['assets']['total_assets']);

        // Step 7: Reversal Test
        $reversalJournal = ReversalService::reverseTransaction($incomeTx->fresh(), $this->admin, 'Correction testing');
        $this->assertEquals('REVERSED', $incomeTx->fresh()->status);
        $this->assertEquals('POSTED', $journal->fresh()->status);
        $this->assertEquals('POSTED', $reversalJournal->status);
        $this->assertTrue($reversalJournal->is_reversal);

        // Step 8: Verify Balance Sheet post-reversal
        $bsPost = FinancialReportService::getBalanceSheet(date('Y-m-d'));
        $this->assertTrue($bsPost['is_balanced']);
        $this->assertEquals(0.00, $bsPost['assets']['total_assets']);
    }
}

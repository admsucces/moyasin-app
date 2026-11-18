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

class FinancialReportingTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\AccountSeeder::class);
        $this->seed(\Database\Seeders\AccountingPeriodSeeder::class);
        $this->seed(\Database\Seeders\ProgramSeeder::class);
        $this->seed(\Database\Seeders\DonorSeeder::class);

        $adminRole = Role::where('code', 'ADMIN')->first();

        $this->adminUser = User::create([
            'username' => 'reportadmin',
            'name' => 'Report Admin',
            'email' => 'reportadmin@example.com',
            'password' => bcrypt('password123'),
            'role_id' => $adminRole->id,
            'is_active' => true,
        ]);
    }

    public function test_balance_sheet_endpoint_returns_balanced_structure()
    {
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/reports/balance-sheet?as_of_date=' . date('Y-m-d'));

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_balanced', true);
    }

    public function test_income_statement_and_cash_flow_after_posted_transactions()
    {
        $period = AccountingPeriod::where('status', 'OPEN')->first();
        $program = Program::first();
        $donor = Donor::first();
        $cashAcc = CashBankAccount::first();

        $incomeAccount = Account::where('code', '4101')->first();
        $expenseAccount = Account::where('code', '5101')->first();

        // 1. Create & Post Income Transaction
        $incomeTx = Transaction::create([
            'transaction_no' => 'INC-REP-001',
            'type' => 'INCOME',
            'transaction_date' => date('Y-m-d'),
            'accounting_period_id' => $period->id,
            'program_id' => $program->id,
            'donor_id' => $donor->id,
            'cash_bank_account_id' => $cashAcc->id,
            'income_account_id' => $incomeAccount->id,
            'restriction_type' => 'WITH_RESTRICTION',
            'amount' => 5000000.00,
            'description' => 'Report Test Income',
            'status' => 'APPROVED',
            'created_by' => $this->adminUser->id,
        ]);

        PostingService::postTransaction($incomeTx, $this->adminUser);

        // 2. Create & Post Expense Transaction
        $expenseTx = Transaction::create([
            'transaction_no' => 'EXP-REP-001',
            'type' => 'EXPENSE',
            'transaction_date' => date('Y-m-d'),
            'accounting_period_id' => $period->id,
            'program_id' => $program->id,
            'cash_bank_account_id' => $cashAcc->id,
            'expense_account_id' => $expenseAccount->id,
            'amount' => 2000000.00,
            'description' => 'Report Test Expense',
            'status' => 'APPROVED',
            'created_by' => $this->adminUser->id,
        ]);

        PostingService::postTransaction($expenseTx, $this->adminUser);

        // 3. Test Income Statement Endpoint
        $resIncome = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/reports/income-statement?start_date=' . date('Y-01-01') . '&end_date=' . date('Y-m-d'));

        $resIncome->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.revenues.total_revenue', 5000000)
            ->assertJsonPath('data.expenses.total_expense', 2000000)
            ->assertJsonPath('data.surplus_deficit.total_surplus', 3000000);

        // 4. Test Changes in Net Assets Endpoint
        $resChanges = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/reports/changes-in-net-assets?start_date=' . date('Y-01-01') . '&end_date=' . date('Y-m-d'));

        $resChanges->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.current_period_changes.total_surplus', 3000000);

        // 5. Test Cash Flow Endpoint
        $resCash = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/reports/cash-flows?start_date=' . date('Y-01-01') . '&end_date=' . date('Y-m-d'));

        $resCash->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.operating_activities.cash_receipts', 5000000)
            ->assertJsonPath('data.operating_activities.cash_disbursements', 2000000)
            ->assertJsonPath('data.net_cash_increase_decrease', 3000000)
            ->assertJsonPath('data.is_reconciled', true);

        // 6. Test Management Summary Endpoint
        $resMgmt = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/reports/management?start_date=' . date('Y-01-01') . '&end_date=' . date('Y-m-d'));

        $resMgmt->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.expense_by_program.total', 2000000)
            ->assertJsonPath('data.income_by_donor.total', 5000000);
    }

    public function test_comparative_balance_sheet_returns_month_year_comparisons()
    {
        $currentMonth = (int) date('m');
        $currentYear = (int) date('Y');

        $res = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson("/api/v1/reports/balance-sheet?month={$currentMonth}&year={$currentYear}&compare_mode=PRIOR_MONTH");

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_comparative', true)
            ->assertJsonPath('data.current_period.month', $currentMonth)
            ->assertJsonPath('data.current_period.year', $currentYear);
    }

    public function test_comparative_income_statement_returns_month_year_comparisons()
    {
        $currentMonth = (int) date('m');
        $currentYear = (int) date('Y');

        $res = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson("/api/v1/reports/income-statement?month={$currentMonth}&year={$currentYear}&period_type=MONTH&compare_mode=PRIOR_MONTH");

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_comparative', true)
            ->assertJsonPath('data.current_period.month', $currentMonth)
            ->assertJsonPath('data.current_period.year', $currentYear);
    }
}

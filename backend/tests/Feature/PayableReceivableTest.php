<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\CashBankAccount;
use App\Models\Donor;
use App\Models\Payable;
use App\Models\Receivable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayableReceivableTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        Account::updateOrCreate(
            ['code' => '2101'],
            ['name' => 'Utang Operasional & Usaha', 'type' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'is_postable' => true]
        );

        Account::updateOrCreate(
            ['code' => '1104'],
            ['name' => 'Piutang Donasi & Operasional', 'type' => 'ASSET', 'normal_balance' => 'DEBIT', 'is_postable' => true]
        );

        AccountingPeriod::updateOrCreate(
            ['year' => 2026, 'month' => 1],
            [
                'name' => 'Januari 2026',
                'start_date' => '2026-01-01',
                'end_date' => '2026-01-31',
                'status' => 'OPEN',
            ]
        );
    }

    public function test_create_and_pay_payable()
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();
        $utangAccount = Account::where('code', '2101')->first();
        $cashBank = CashBankAccount::first();

        // 1. Create Payable (Hutang)
        $payload = [
            'vendor_name' => 'PT Toko Bangunan Jaya',
            'invoice_no' => 'INV-TB-99',
            'transaction_date' => '2026-01-05',
            'due_date' => '2026-01-25',
            'total_amount' => 5000000,
            'payable_account_id' => $utangAccount->id,
            'description' => 'Pembelian semen dan cat renovasi',
        ];

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/payables', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $payable = Payable::where('vendor_name', 'PT Toko Bangunan Jaya')->first();
        $this->assertEquals('UNPAID', $payable->status);
        $this->assertEquals(5000000, $payable->remaining_balance);

        // 2. Pay Payable (Pelunasan Hutang)
        $payPayload = [
            'payment_date' => '2026-01-10',
            'amount' => 5000000,
            'cash_bank_account_id' => $cashBank->id,
            'notes' => 'Lunas via Transfer Bank',
        ];

        $payResponse = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/payables/{$payable->id}/pay", $payPayload);

        $payResponse->assertStatus(200)
            ->assertJsonPath('success', true);

        $payable->refresh();
        $this->assertEquals('PAID', $payable->status);
        $this->assertEquals(0, $payable->remaining_balance);

        $this->assertDatabaseHas('journals', [
            'description' => "Pelunasan Hutang [{$payable->payable_no}] kepada PT Toko Bangunan Jaya",
            'status' => 'POSTED',
        ]);
    }

    public function test_create_and_receive_receivable()
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();
        $piutangAccount = Account::where('code', '1104')->first();
        $cashBank = CashBankAccount::first();

        // 1. Create Receivable (Piutang)
        $payload = [
            'customer_name' => 'H. Ahmad Subarkah (Donatur Tetap)',
            'invoice_no' => 'TAG-DON-01',
            'transaction_date' => '2026-01-02',
            'due_date' => '2026-01-15',
            'total_amount' => 3000000,
            'receivable_account_id' => $piutangAccount->id,
            'description' => 'Komitmen donasi bulanan panti yatim',
        ];

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/receivables', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $receivable = Receivable::where('customer_name', 'H. Ahmad Subarkah (Donatur Tetap)')->first();
        $this->assertEquals('UNPAID', $receivable->status);

        // 2. Receive Receivable (Pelunasan Piutang)
        $recPayload = [
            'payment_date' => '2026-01-12',
            'amount' => 3000000,
            'cash_bank_account_id' => $cashBank->id,
            'notes' => 'Penerimaan donasi masuk ke bank',
        ];

        $recResponse = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/receivables/{$receivable->id}/receive", $recPayload);

        $recResponse->assertStatus(200)
            ->assertJsonPath('success', true);

        $receivable->refresh();
        $this->assertEquals('PAID', $receivable->status);
        $this->assertEquals(0, $receivable->remaining_balance);

        $this->assertDatabaseHas('journals', [
            'description' => "Penerimaan Pelunasan Piutang [{$receivable->receivable_no}] dari H. Ahmad Subarkah (Donatur Tetap)",
            'status' => 'POSTED',
        ]);
    }
}

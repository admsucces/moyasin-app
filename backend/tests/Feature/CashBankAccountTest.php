<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CashBankAccountTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_admin_can_create_cash_bank_account(): void
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();

        $response = $this->actingAs($admin, 'sanctum')
                         ->postJson('/api/v1/cash-bank-accounts', [
                             'account_id' => 5, // Bank Program Yatim
                             'type' => 'BANK',
                             'name' => 'Rekening Bank Syariah Mandiri Yatim',
                             'bank_name' => 'BSI Yatim',
                             'account_number' => '9988776655',
                             'account_holder' => 'Yayasan Yatim Piatu',
                         ]);

        $response->assertStatus(201)
                 ->assertJson([
                     'success' => true,
                     'data' => [
                         'name' => 'Rekening Bank Syariah Mandiri Yatim',
                         'type' => 'BANK',
                         'balance' => '0.00',
                     ],
                 ]);

        $this->assertDatabaseHas('cash_bank_accounts', ['account_id' => 5]);
    }

    public function test_pengelola_cannot_create_cash_bank_account(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->postJson('/api/v1/cash-bank-accounts', [
                             'account_id' => 5,
                             'type' => 'CASH',
                             'name' => 'Kas Unauthorized',
                         ]);

        $response->assertStatus(403);
    }
}

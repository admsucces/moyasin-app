<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InitialBalanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_get_initial_balances()
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/initial-balances');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'as_of_date',
                    'has_setup',
                    'accounts',
                    'total_debit',
                    'total_credit',
                    'is_balanced',
                ]
            ]);
    }

    public function test_save_balanced_initial_balances()
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();

        $kas = Account::where('code', '1101')->first();
        $bsi = Account::where('code', '1102')->first();
        $equity = Account::where('code', '3101')->first();

        $payload = [
            'as_of_date' => '2026-01-01',
            'balances' => [
                ['account_id' => $kas->id, 'debit' => 5000000, 'credit' => 0],
                ['account_id' => $bsi->id, 'debit' => 15000000, 'credit' => 0],
                ['account_id' => $equity->id, 'debit' => 0, 'credit' => 20000000],
            ],
            'auto_balance' => false,
        ];

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/initial-balances', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('journals', [
            'description' => 'Setup Saldo Awal Akun Yayasan',
            'status' => 'POSTED',
        ]);
    }

    public function test_save_imbalanced_initial_balances_fails_without_auto_balance()
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();

        $kas = Account::where('code', '1101')->first();

        $payload = [
            'as_of_date' => '2026-01-01',
            'balances' => [
                ['account_id' => $kas->id, 'debit' => 5000000, 'credit' => 0],
            ],
            'auto_balance' => false,
        ];

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/initial-balances', $payload);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }
}

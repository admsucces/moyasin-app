<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountMasterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_authenticated_user_can_view_accounts(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->getJson('/api/v1/accounts');

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Daftar akun COA berhasil diambil.',
                 ]);
    }

    public function test_admin_can_create_new_account(): void
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();

        $response = $this->actingAs($admin, 'sanctum')
                         ->postJson('/api/v1/accounts', [
                             'code' => '1104',
                             'name' => 'Kas Kecil Operasional',
                             'type' => 'ASSET',
                             'normal_balance' => 'DEBIT',
                             'parent_id' => 2,
                             'is_postable' => true,
                         ]);

        $response->assertStatus(201)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Akun COA baru berhasil dibuat.',
                     'data' => [
                         'code' => '1104',
                         'name' => 'Kas Kecil Operasional',
                     ],
                 ]);

        $this->assertDatabaseHas('accounts', ['code' => '1104']);
    }

    public function test_create_account_validates_unique_code(): void
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();

        $response = $this->actingAs($admin, 'sanctum')
                         ->postJson('/api/v1/accounts', [
                             'code' => '1101', // Existing code
                             'name' => 'Kas Duplikat',
                             'type' => 'ASSET',
                             'normal_balance' => 'DEBIT',
                         ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['code']);
    }

    public function test_pengelola_cannot_create_account(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->postJson('/api/v1/accounts', [
                             'code' => '1105',
                             'name' => 'Kas Unauthorized',
                             'type' => 'ASSET',
                             'normal_balance' => 'DEBIT',
                         ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_deactivate_account(): void
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();
        $account = Account::where('code', '1101')->first();

        $response = $this->actingAs($admin, 'sanctum')
                         ->postJson("/api/v1/accounts/{$account->id}/deactivate");

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'data' => [
                         'is_active' => false,
                     ],
                 ]);

        $this->assertDatabaseHas('accounts', [
            'id' => $account->id,
            'is_active' => false,
        ]);
    }
}

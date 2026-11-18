<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExportTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\AccountSeeder::class);
        $this->seed(\Database\Seeders\AccountingPeriodSeeder::class);

        $adminRole = Role::where('code', 'ADMIN')->first();

        $this->user = User::create([
            'username' => 'exportuser',
            'name' => 'Export User',
            'email' => 'exportuser@example.com',
            'password' => bcrypt('password123'),
            'role_id' => $adminRole->id,
            'is_active' => true,
        ]);
    }

    public function test_export_transactions_csv_endpoint()
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/v1/export/transactions');

        $response->assertStatus(200);
        $this->assertTrue(str_contains($response->headers->get('content-type'), 'text/csv'));
    }

    public function test_export_trial_balance_csv_endpoint()
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->get('/api/v1/export/reports/trial-balance');

        $response->assertStatus(200);
        $this->assertTrue(str_contains($response->headers->get('content-type'), 'text/csv'));
    }
}

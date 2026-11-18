<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $pengelola;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\RoleSeeder::class);
        $this->seed(\Database\Seeders\AccountSeeder::class);

        $adminRole = Role::where('code', 'ADMIN')->first();
        $pengelolaRole = Role::where('code', 'PENGELOLA')->first();

        $this->admin = User::create([
            'username' => 'secadmin',
            'name' => 'Sec Admin',
            'email' => 'secadmin@example.com',
            'password' => bcrypt('password123'),
            'role_id' => $adminRole->id,
            'is_active' => true,
        ]);

        $this->pengelola = User::create([
            'username' => 'secpengelola',
            'name' => 'Sec Pengelola',
            'email' => 'secpengelola@example.com',
            'password' => bcrypt('password123'),
            'role_id' => $pengelolaRole->id,
            'is_active' => true,
        ]);
    }

    public function test_unauthenticated_requests_are_rejected_with_401()
    {
        $response = $this->getJson('/api/v1/accounts');
        $response->assertStatus(401);
    }

    public function test_pengelola_cannot_create_users()
    {
        $response = $this->actingAs($this->pengelola, 'sanctum')
            ->postJson('/api/v1/users', [
                'username' => 'hacker',
                'name' => 'Hacker User',
                'email' => 'hacker@example.com',
                'password' => 'password123',
                'role_id' => $this->admin->role_id,
            ]);

        $response->assertStatus(403);
    }

    public function test_pengelola_cannot_post_transaction_directly()
    {
        $response = $this->actingAs($this->pengelola, 'sanctum')
            ->postJson('/api/v1/transactions/1/post');

        $response->assertStatus(403);
    }
}

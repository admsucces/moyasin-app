<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@yayasan.org',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Login berhasil.',
                 ])
                 ->assertJsonStructure([
                     'success',
                     'message',
                     'data' => [
                         'token',
                         'user' => ['id', 'name', 'email', 'status', 'role'],
                     ],
                 ]);

        $this->assertDatabaseHas('users', [
            'email' => 'admin@yayasan.org',
        ]);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@yayasan.org',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401)
                 ->assertJson([
                     'success' => false,
                     'message' => 'Alamat email atau kata sandi yang Anda masukkan salah.',
                 ]);
    }

    public function test_inactive_user_cannot_login(): void
    {
        $adminRole = Role::where('code', 'ADMIN')->first();
        $inactiveUser = User::create([
            'name' => 'User Nonaktif',
            'email' => 'inactive@yayasan.org',
            'password' => 'password123',
            'role_id' => $adminRole->id,
            'status' => 'INACTIVE',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'inactive@yayasan.org',
            'password' => 'password123',
        ]);

        $response->assertStatus(403)
                 ->assertJson([
                     'success' => false,
                     'message' => 'Akun Anda sedang nonaktif. Silakan hubungi Administrator.',
                 ]);
    }

    public function test_authenticated_user_can_get_current_profile(): void
    {
        $user = User::where('email', 'pengelola@yayasan.org')->first();

        $response = $this->actingAs($user, 'sanctum')
                         ->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'data' => [
                         'user' => [
                             'email' => 'pengelola@yayasan.org',
                             'role' => [
                                 'code' => 'PENGELOLA',
                             ],
                         ],
                     ],
                 ]);
    }

    public function test_unauthenticated_user_cannot_access_protected_endpoint(): void
    {
        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(401)
                 ->assertJson([
                     'success' => false,
                     'message' => 'Anda belum terautentikasi.',
                 ]);
    }

    public function test_user_can_logout(): void
    {
        $user = User::where('email', 'owner@yayasan.org')->first();

        $response = $this->actingAs($user, 'sanctum')
                         ->postJson('/api/v1/auth/logout');

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Logout berhasil.',
                 ]);
    }
}

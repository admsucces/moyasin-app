<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_admin_can_view_user_list(): void
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();

        $response = $this->actingAs($admin, 'sanctum')
                         ->getJson('/api/v1/users');

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Daftar pengguna berhasil diambil.',
                 ])
                 ->assertJsonStructure([
                     'data' => [
                         '*' => ['id', 'name', 'email', 'status', 'role'],
                     ],
                     'meta' => ['page', 'per_page', 'total', 'total_pages'],
                 ]);
    }

    public function test_pengelola_cannot_view_user_list(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->getJson('/api/v1/users');

        $response->assertStatus(403)
                 ->assertJson([
                     'success' => false,
                     'message' => 'Anda tidak memiliki hak akses (permission) untuk tindakan ini.',
                 ]);
    }

    public function test_owner_cannot_view_user_list(): void
    {
        $owner = User::where('email', 'owner@yayasan.org')->first();

        $response = $this->actingAs($owner, 'sanctum')
                         ->getJson('/api/v1/users');

        $response->assertStatus(403)
                 ->assertJson([
                     'success' => false,
                     'message' => 'Anda tidak memiliki hak akses (permission) untuk tindakan ini.',
                 ]);
    }

    public function test_admin_can_create_new_user(): void
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();

        $response = $this->actingAs($admin, 'sanctum')
                         ->postJson('/api/v1/users', [
                             'name' => 'Staf Pengelola Baru',
                             'email' => 'staf.baru@yayasan.org',
                             'password' => 'secret123',
                             'role_id' => 2,
                         ]);

        $response->assertStatus(201)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Pengguna baru berhasil dibuat.',
                     'data' => [
                         'name' => 'Staf Pengelola Baru',
                         'email' => 'staf.baru@yayasan.org',
                         'status' => 'ACTIVE',
                     ],
                 ]);

        $this->assertDatabaseHas('users', [
            'email' => 'staf.baru@yayasan.org',
        ]);
    }

    public function test_user_creation_validates_unique_email(): void
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();

        $response = $this->actingAs($admin, 'sanctum')
                         ->postJson('/api/v1/users', [
                             'name' => 'Pengelola Duplikat',
                             'email' => 'pengelola@yayasan.org', // Email sudah ada
                             'password' => 'secret123',
                             'role_id' => 2,
                         ]);

        $response->assertStatus(422)
                 ->assertJson([
                     'success' => false,
                     'message' => 'Validasi gagal.',
                 ])
                 ->assertJsonValidationErrors(['email']);
    }

    public function test_admin_can_update_user(): void
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();

        $response = $this->actingAs($admin, 'sanctum')
                         ->putJson("/api/v1/users/{$pengelola->id}", [
                             'name' => 'Nama Pengelola Updated',
                             'email' => 'pengelola.updated@yayasan.org',
                             'role_id' => 2,
                         ]);

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Data pengguna berhasil diperbarui.',
                     'data' => [
                         'name' => 'Nama Pengelola Updated',
                         'email' => 'pengelola.updated@yayasan.org',
                     ],
                 ]);

        $this->assertDatabaseHas('users', [
            'id' => $pengelola->id,
            'email' => 'pengelola.updated@yayasan.org',
        ]);
    }

    public function test_admin_can_toggle_user_status(): void
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();

        $response = $this->actingAs($admin, 'sanctum')
                         ->postJson("/api/v1/users/{$pengelola->id}/status", [
                             'status' => 'INACTIVE',
                         ]);

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Status pengguna berhasil diubah menjadi INACTIVE.',
                     'data' => [
                         'status' => 'INACTIVE',
                     ],
                 ]);

        $this->assertDatabaseHas('users', [
            'id' => $pengelola->id,
            'status' => 'INACTIVE',
        ]);
    }
}

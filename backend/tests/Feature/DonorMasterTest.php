<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DonorMasterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_pengelola_can_create_donor(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->postJson('/api/v1/donors', [
                             'name' => 'Hamba Allah (Donatur Dermawan)',
                             'phone' => '081234567890',
                             'email' => 'donatur@example.org',
                             'address' => 'Jakarta',
                             'notes' => 'Donatur rutin bulanan',
                         ]);

        $response->assertStatus(201)
                 ->assertJson([
                     'success' => true,
                     'data' => [
                         'name' => 'Hamba Allah (Donatur Dermawan)',
                         'phone' => '081234567890',
                     ],
                 ]);

        $this->assertDatabaseHas('donors', ['name' => 'Hamba Allah (Donatur Dermawan)']);
    }

    public function test_owner_cannot_create_donor(): void
    {
        $owner = User::where('email', 'owner@yayasan.org')->first();

        $response = $this->actingAs($owner, 'sanctum')
                         ->postJson('/api/v1/donors', [
                             'name' => 'Donatur Test Owner',
                         ]);

        $response->assertStatus(403);
    }
}

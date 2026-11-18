<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountingPeriodTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_admin_and_owner_can_create_accounting_period(): void
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();

        $response = $this->actingAs($admin, 'sanctum')
                         ->postJson('/api/v1/accounting-periods', [
                             'name' => 'Periode Oktober 2026',
                             'start_date' => '2026-10-01',
                             'end_date' => '2026-10-31',
                         ]);

        $response->assertStatus(201)
                 ->assertJson([
                     'success' => true,
                     'data' => [
                         'name' => 'Periode Oktober 2026',
                         'status' => 'OPEN',
                     ],
                 ]);

        $this->assertDatabaseHas('accounting_periods', ['name' => 'Periode Oktober 2026']);
    }

    public function test_cannot_create_overlapping_accounting_period(): void
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();

        // Attempt overlapping period with seeded September 2026 (2026-09-01 to 2026-09-30)
        $response = $this->actingAs($admin, 'sanctum')
                         ->postJson('/api/v1/accounting-periods', [
                             'name' => 'Periode Overlap',
                             'start_date' => '2026-09-15',
                             'end_date' => '2026-10-15',
                         ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['start_date']);
    }

    public function test_pengelola_cannot_create_accounting_period(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->postJson('/api/v1/accounting-periods', [
                             'name' => 'Periode Unauthorized',
                             'start_date' => '2026-11-01',
                             'end_date' => '2026-11-30',
                         ]);

        $response->assertStatus(403);
    }
}

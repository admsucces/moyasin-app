<?php

namespace Tests\Feature;

use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProgramMasterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_program_seeder_populates_reference_data(): void
    {
        $this->assertDatabaseHas('programs', ['code' => 'YATIM']);
        $this->assertDatabaseHas('programs', ['code' => 'DHUAFA']);
        $this->assertDatabaseHas('programs', ['code' => 'LANSIA']);
        $this->assertDatabaseHas('programs', ['code' => 'OPERASIONAL']);
        $this->assertDatabaseHas('programs', ['code' => 'LAINNYA']);
    }

    public function test_admin_can_create_new_program(): void
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();

        $response = $this->actingAs($admin, 'sanctum')
                         ->postJson('/api/v1/programs', [
                             'code' => 'BEASISWA',
                             'name' => 'Program Beasiswa Pelajar',
                             'description' => 'Bantuan beasiswa pendidikan anak kurang mampu',
                         ]);

        $response->assertStatus(201)
                 ->assertJson([
                     'success' => true,
                     'data' => [
                         'code' => 'BEASISWA',
                         'name' => 'Program Beasiswa Pelajar',
                     ],
                 ]);

        $this->assertDatabaseHas('programs', ['code' => 'BEASISWA']);
    }

    public function test_pengelola_cannot_create_program(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->postJson('/api/v1/programs', [
                             'code' => 'KESEHATAN',
                             'name' => 'Program Kesehatan',
                         ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_deactivate_program(): void
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();
        $program = Program::where('code', 'LAINNYA')->first();

        $response = $this->actingAs($admin, 'sanctum')
                         ->postJson("/api/v1/programs/{$program->id}/deactivate");

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'data' => [
                         'is_active' => false,
                     ],
                 ]);

        $this->assertDatabaseHas('programs', [
            'id' => $program->id,
            'is_active' => false,
        ]);
    }
}

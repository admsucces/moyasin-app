<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\FixedAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FixedAssetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        // Ensure COA accounts for depreciation exist
        Account::updateOrCreate(
            ['code' => '1301'],
            ['name' => 'Aset Tetap - Kendaraan & Peralatan', 'type' => 'ASSET', 'normal_balance' => 'DEBIT', 'is_postable' => true]
        );

        Account::updateOrCreate(
            ['code' => '1302'],
            ['name' => 'Akumulasi Penyusutan Aset Tetap', 'type' => 'ASSET', 'normal_balance' => 'CREDIT', 'is_postable' => true]
        );

        Account::updateOrCreate(
            ['code' => '5202'],
            ['name' => 'Beban Penyusutan Aset Tetap', 'type' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'is_postable' => true]
        );

        AccountingPeriod::updateOrCreate(
            ['year' => 2026, 'month' => 1],
            [
                'name' => 'Januari 2026',
                'start_date' => '2026-01-01',
                'end_date' => '2026-01-31',
                'status' => 'OPEN',
            ]
        );
    }

    public function test_create_fixed_asset()
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();

        $assetAccount = Account::where('code', '1301')->first();
        $accumAccount = Account::where('code', '1302')->first();
        $expenseAccount = Account::where('code', '5202')->first();

        $payload = [
            'asset_code' => 'AST-001',
            'name' => 'Mobil Ambulans Operasional',
            'acquisition_date' => '2026-01-01',
            'acquisition_cost' => 120000000,
            'useful_life_years' => 5,
            'salvage_value' => 0,
            'depreciation_method' => 'STRAIGHT_LINE',
            'asset_account_id' => $assetAccount->id,
            'accumulated_depr_account_id' => $accumAccount->id,
            'depreciation_expense_account_id' => $expenseAccount->id,
            'description' => 'Pembelian Ambulans Baru',
        ];

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/fixed-assets', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('fixed_assets', [
            'asset_code' => 'AST-001',
            'acquisition_cost' => 120000000,
        ]);
    }

    public function test_get_fixed_assets_list()
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/fixed-assets');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    public function test_process_monthly_depreciation()
    {
        $admin = User::where('email', 'admin@yayasan.org')->first();

        $assetAccount = Account::where('code', '1301')->first();
        $accumAccount = Account::where('code', '1302')->first();
        $expenseAccount = Account::where('code', '5202')->first();

        $asset = FixedAsset::create([
            'asset_code' => 'AST-002',
            'name' => 'Laptop Kantor Yayasan',
            'acquisition_date' => '2026-01-01',
            'acquisition_cost' => 12000000, // 12 juta
            'useful_life_years' => 1, // 1 tahun = 12 bulan (1 juta per bulan)
            'salvage_value' => 0,
            'depreciation_method' => 'STRAIGHT_LINE',
            'asset_account_id' => $assetAccount->id,
            'accumulated_depr_account_id' => $accumAccount->id,
            'depreciation_expense_account_id' => $expenseAccount->id,
            'status' => 'ACTIVE',
        ]);

        $payload = [
            'year' => 2026,
            'month' => 1,
        ];

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/fixed-assets/depreciate', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.processed_count', 1);

        $this->assertDatabaseHas('fixed_asset_depreciations', [
            'fixed_asset_id' => $asset->id,
            'year' => 2026,
            'month' => 1,
            'amount' => 1000000,
        ]);

        $this->assertDatabaseHas('journals', [
            'description' => 'Penyusutan Aset Tetap [AST-002] Laptop Kantor Yayasan Periode 01/2026',
            'status' => 'POSTED',
        ]);
    }
}

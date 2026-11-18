<?php

namespace Database\Seeders;

use App\Models\Account;
use Illuminate\Database\Seeder;

class FixedAssetAccountSeeder extends Seeder
{
    public function run(): void
    {
        $accs = [
            ['code' => '1300', 'name' => 'Aset Tetap', 'type' => 'ASSET', 'normal_balance' => 'DEBIT', 'is_postable' => false, 'parent_id' => 1],
            ['code' => '1301', 'name' => 'Peralatan & Inventaris Kantor', 'type' => 'ASSET', 'normal_balance' => 'DEBIT', 'is_postable' => true, 'parent_id' => null],
            ['code' => '1302', 'name' => 'Akumulasi Penyusutan Peralatan', 'type' => 'ASSET', 'normal_balance' => 'CREDIT', 'is_postable' => true, 'parent_id' => null],
            ['code' => '1303', 'name' => 'Gedung & Bangunan', 'type' => 'ASSET', 'normal_balance' => 'DEBIT', 'is_postable' => true, 'parent_id' => null],
            ['code' => '1304', 'name' => 'Akumulasi Penyusutan Gedung', 'type' => 'ASSET', 'normal_balance' => 'CREDIT', 'is_postable' => true, 'parent_id' => null],
            ['code' => '1305', 'name' => 'Kendaraan Operasional', 'type' => 'ASSET', 'normal_balance' => 'DEBIT', 'is_postable' => true, 'parent_id' => null],
            ['code' => '1306', 'name' => 'Akumulasi Penyusutan Kendaraan', 'type' => 'ASSET', 'normal_balance' => 'CREDIT', 'is_postable' => true, 'parent_id' => null],
            ['code' => '5202', 'name' => 'Beban Penyusutan Aset Tetap', 'type' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'is_postable' => true, 'parent_id' => 40],
        ];

        foreach ($accs as $a) {
            Account::firstOrCreate(['code' => $a['code']], $a);
        }
    }
}


<?php

namespace Database\Seeders;

use App\Models\AccountingPeriod;
use Illuminate\Database\Seeder;

class AccountingPeriodSeeder extends Seeder
{
    public function run(): void
    {
        AccountingPeriod::updateOrCreate(
            ['name' => 'September 2026'],
            [
                'start_date' => '2026-09-01',
                'end_date' => '2026-09-30',
                'status' => 'OPEN',
            ]
        );

        AccountingPeriod::updateOrCreate(
            ['name' => date('F Y')],
            [
                'start_date' => date('Y-m-01'),
                'end_date' => date('Y-m-t'),
                'status' => 'OPEN',
            ]
        );
    }
}

<?php

namespace Database\Seeders;

use App\Models\Donor;
use Illuminate\Database\Seeder;

class DonorSeeder extends Seeder
{
    public function run(): void
    {
        Donor::updateOrCreate(
            ['email' => 'ahmad@gmail.com'],
            [
                'name' => 'H. Ahmad Subarkah',
                'phone' => '081234567890',
                'address' => 'Jl. Merdeka No. 12, Jakarta',
                'notes' => 'Donatur Tetap Yatim',
                'is_active' => true,
            ]
        );
    }
}

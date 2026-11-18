<?php

namespace Database\Seeders;

use App\Models\Program;
use Illuminate\Database\Seeder;

class ProgramSeeder extends Seeder
{
    public function run(): void
    {
        $programs = [
            [
                'code' => 'YATIM',
                'name' => 'Program Yatim Piatu',
                'description' => 'Pelayanan santunan, pendidikan, dan kebutuhan anak yatim piatu.',
                'is_active' => true,
            ],
            [
                'code' => 'DHUAFA',
                'name' => 'Program Dhuafa',
                'description' => 'Bantuan sembako, kesehatan, dan pemberdayaan ekonomi keluarga dhuafa.',
                'is_active' => true,
            ],
            [
                'code' => 'LANSIA',
                'name' => 'Program Lansia',
                'description' => 'Pelayanan perawatan kesehatan dan kebutuhan lansia terlantar.',
                'is_active' => true,
            ],
            [
                'code' => 'OPERASIONAL',
                'name' => 'Operasional Yayasan',
                'description' => 'Kegiatan rutin operasional dan administrasi sekretariat yayasan.',
                'is_active' => true,
            ],
            [
                'code' => 'LAINNYA',
                'name' => 'Program Lainnya',
                'description' => 'Kegiatan insidental dan bantuan sosial kemasyarakatan lainnya.',
                'is_active' => true,
            ],
        ];

        foreach ($programs as $prog) {
            Program::updateOrCreate(['code' => $prog['code']], $prog);
        }
    }
}

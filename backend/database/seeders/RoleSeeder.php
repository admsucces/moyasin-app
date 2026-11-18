<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['id' => 1, 'code' => 'ADMIN', 'name' => 'Administrator'],
            ['id' => 2, 'code' => 'PENGELOLA', 'name' => 'Pengelola Keuangan'],
            ['id' => 3, 'code' => 'OWNER', 'name' => 'Owner / Pengawas'],
        ];

        foreach ($roles as $roleData) {
            Role::updateOrCreate(['id' => $roleData['id']], $roleData);
        }
    }
}

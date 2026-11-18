<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name' => 'Administrator Utama',
                'email' => 'admin@yayasan.org',
                'password' => 'password123',
                'role_id' => 1,
                'status' => 'ACTIVE',
            ],
            [
                'name' => 'Pengelola Keuangan',
                'email' => 'pengelola@yayasan.org',
                'password' => 'password123',
                'role_id' => 2,
                'status' => 'ACTIVE',
            ],
            [
                'name' => 'Owner Yayasan',
                'email' => 'owner@yayasan.org',
                'password' => 'password123',
                'role_id' => 3,
                'status' => 'ACTIVE',
            ],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['email' => $userData['email']],
                $userData
            );
        }
    }
}

<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\CashBankAccount;
use Illuminate\Database\Seeder;

class AccountSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            // ASET (1000)
            ['id' => 1, 'code' => '1000', 'name' => 'ASET', 'type' => 'ASSET', 'normal_balance' => 'DEBIT', 'is_postable' => false, 'parent_id' => null],
            ['id' => 2, 'code' => '1100', 'name' => 'Aset Lancar', 'type' => 'ASSET', 'normal_balance' => 'DEBIT', 'is_postable' => false, 'parent_id' => 1],
            ['id' => 3, 'code' => '1101', 'name' => 'Kas Tunai Yayasan', 'type' => 'ASSET', 'normal_balance' => 'DEBIT', 'is_postable' => true, 'parent_id' => 2],
            ['id' => 4, 'code' => '1102', 'name' => 'Bank Operasional Yayasan', 'type' => 'ASSET', 'normal_balance' => 'DEBIT', 'is_postable' => true, 'parent_id' => 2],
            ['id' => 5, 'code' => '1103', 'name' => 'Bank Program Yatim', 'type' => 'ASSET', 'normal_balance' => 'DEBIT', 'is_postable' => true, 'parent_id' => 2],

            // LIABILITAS (2000)
            ['id' => 10, 'code' => '2000', 'name' => 'LIABILITAS', 'type' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'is_postable' => false, 'parent_id' => null],
            ['id' => 11, 'code' => '2100', 'name' => 'Liabilitas Jangka Pendek', 'type' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'is_postable' => false, 'parent_id' => 10],
            ['id' => 12, 'code' => '2101', 'name' => 'Utang Operasional', 'type' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'is_postable' => true, 'parent_id' => 11],

            // ASET NETO (3000)
            ['id' => 20, 'code' => '3000', 'name' => 'ASET NETO', 'type' => 'EQUITY', 'normal_balance' => 'CREDIT', 'is_postable' => false, 'parent_id' => null],
            ['id' => 21, 'code' => '3101', 'name' => 'Aset Neto Tanpa Pembatasan', 'type' => 'EQUITY', 'normal_balance' => 'CREDIT', 'is_postable' => true, 'parent_id' => 20],
            ['id' => 22, 'code' => '3201', 'name' => 'Aset Neto Dengan Pembatasan', 'type' => 'EQUITY', 'normal_balance' => 'CREDIT', 'is_postable' => true, 'parent_id' => 20],

            // PENDAPATAN / PENERIMAAN (4000)
            ['id' => 30, 'code' => '4000', 'name' => 'PENERIMAAN DANA', 'type' => 'INCOME', 'normal_balance' => 'CREDIT', 'is_postable' => false, 'parent_id' => null],
            ['id' => 31, 'code' => '4101', 'name' => 'Penerimaan Donasi Yatim', 'type' => 'INCOME', 'normal_balance' => 'CREDIT', 'is_postable' => true, 'parent_id' => 30],
            ['id' => 32, 'code' => '4102', 'name' => 'Penerimaan Donasi Dhuafa', 'type' => 'INCOME', 'normal_balance' => 'CREDIT', 'is_postable' => true, 'parent_id' => 30],
            ['id' => 33, 'code' => '4103', 'name' => 'Penerimaan Donasi Lansia', 'type' => 'INCOME', 'normal_balance' => 'CREDIT', 'is_postable' => true, 'parent_id' => 30],
            ['id' => 34, 'code' => '4104', 'name' => 'Penerimaan Sumbangan Umum', 'type' => 'INCOME', 'normal_balance' => 'CREDIT', 'is_postable' => true, 'parent_id' => 30],

            // BEBAN / PENGELUARAN (5000)
            ['id' => 40, 'code' => '5000', 'name' => 'BEBAN / PENGELUARAN', 'type' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'is_postable' => false, 'parent_id' => null],
            ['id' => 41, 'code' => '5101', 'name' => 'Beban Program Yatim', 'type' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'is_postable' => true, 'parent_id' => 40],
            ['id' => 42, 'code' => '5102', 'name' => 'Beban Program Dhuafa', 'type' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'is_postable' => true, 'parent_id' => 40],
            ['id' => 43, 'code' => '5103', 'name' => 'Beban Program Lansia', 'type' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'is_postable' => true, 'parent_id' => 40],
            ['id' => 44, 'code' => '5201', 'name' => 'Beban Operasional Sekretariat', 'type' => 'EXPENSE', 'normal_balance' => 'DEBIT', 'is_postable' => true, 'parent_id' => 40],
        ];

        foreach ($accounts as $acc) {
            Account::updateOrCreate(['id' => $acc['id']], $acc);
        }

        // Seed initial Cash & Bank Accounts linked to ledger
        CashBankAccount::updateOrCreate(
            ['account_id' => 3],
            [
                'type' => 'CASH',
                'name' => 'Kas Brankas Yayasan',
                'bank_name' => null,
                'account_number' => null,
                'account_holder' => null,
                'is_active' => true,
            ]
        );

        CashBankAccount::updateOrCreate(
            ['account_id' => 4],
            [
                'type' => 'BANK',
                'name' => 'Rekening Operasional BSI',
                'bank_name' => 'Bank Syariah Indonesia',
                'account_number' => '7123456789',
                'account_holder' => 'Yayasan Yatim Dhuafa Lansia',
                'is_active' => true,
            ]
        );
    }
}

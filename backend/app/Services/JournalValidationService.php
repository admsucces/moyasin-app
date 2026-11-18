<?php

namespace App\Services;

use App\Models\Account;
use Illuminate\Validation\ValidationException;

class JournalValidationService
{
    public static function validateEntries(array $entries): void
    {
        if (count($entries) < 2) {
            throw ValidationException::withMessages([
                'entries' => ['Jurnal minimal terdiri dari 2 baris entri berpasangan (debit dan kredit).'],
            ]);
        }

        $totalDebit = 0.0;
        $totalCredit = 0.0;

        foreach ($entries as $index => $entry) {
            $debit = (float) ($entry['debit'] ?? 0);
            $credit = (float) ($entry['credit'] ?? 0);

            if ($debit < 0 || $credit < 0) {
                throw ValidationException::withMessages([
                    "entries.{$index}" => ["Nominal debit dan kredit tidak boleh bernilai negatif."],
                ]);
            }

            if (($debit > 0 && $credit > 0) || ($debit == 0 && $credit == 0)) {
                throw ValidationException::withMessages([
                    "entries.{$index}" => ["Setiap baris jurnal harus mengisi salah satu sisi saja (Debit atau Kredit)."],
                ]);
            }

            $accountId = $entry['account_id'] ?? null;
            if (!$accountId) {
                throw ValidationException::withMessages([
                    "entries.{$index}.account_id" => ["Akun COA wajib dipilih."],
                ]);
            }

            $account = Account::find($accountId);
            if (!$account) {
                throw ValidationException::withMessages([
                    "entries.{$index}.account_id" => ["Akun COA yang dipilih tidak ditemukan."],
                ]);
            }

            if (!$account->is_active) {
                throw ValidationException::withMessages([
                    "entries.{$index}.account_id" => ["Akun [{$account->code}] {$account->name} sedang nonaktif."],
                ]);
            }

            if (!$account->is_postable) {
                throw ValidationException::withMessages([
                    "entries.{$index}.account_id" => ["Akun [{$account->code}] {$account->name} adalah akun Header/Group dan tidak dapat menerima posting jurnal."],
                ]);
            }

            $totalDebit += $debit;
            $totalCredit += $credit;
        }

        // Round to 2 decimal places to prevent float precision issues
        $totalDebit = round($totalDebit, 2);
        $totalCredit = round($totalCredit, 2);

        if (abs($totalDebit - $totalCredit) > 0.001) {
            $debitFmt = number_format($totalDebit, 2, ',', '.');
            $creditFmt = number_format($totalCredit, 2, ',', '.');
            throw ValidationException::withMessages([
                'entries' => ["Jurnal tidak seimbang (Unbalanced). Total Debit: Rp {$debitFmt}, Total Kredit: Rp {$creditFmt}."],
            ]);
        }
    }
}

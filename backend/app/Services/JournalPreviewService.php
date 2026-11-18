<?php

namespace App\Services;

use App\Models\Transaction;

class JournalPreviewService
{
    public static function buildPreview(Transaction $trx): array
    {
        if ($trx->type === 'INCOME') {
            $debitEntry = [
                'account_id' => $trx->cashBankAccount?->account_id,
                'account_code' => $trx->cashBankAccount?->account?->code ?? '-',
                'account_name' => $trx->cashBankAccount?->account?->name ?? 'Kas / Bank',
                'amount' => number_format((float) $trx->amount, 2, '.', ''),
            ];

            $creditEntry = [
                'account_id' => $trx->income_account_id,
                'account_code' => $trx->incomeAccount?->code ?? '-',
                'account_name' => $trx->incomeAccount?->name ?? 'Akun Penerimaan',
                'amount' => number_format((float) $trx->amount, 2, '.', ''),
            ];

            return [
                'debit' => [$debitEntry],
                'credit' => [$creditEntry],
                'balanced' => true,
            ];
        }

        if ($trx->type === 'EXPENSE') {
            $debitEntry = [
                'account_id' => $trx->expense_account_id,
                'account_code' => $trx->expenseAccount?->code ?? '-',
                'account_name' => $trx->expenseAccount?->name ?? 'Akun Beban / Pengeluaran',
                'amount' => number_format((float) $trx->amount, 2, '.', ''),
            ];

            $creditEntry = [
                'account_id' => $trx->cashBankAccount?->account_id,
                'account_code' => $trx->cashBankAccount?->account?->code ?? '-',
                'account_name' => $trx->cashBankAccount?->account?->name ?? 'Kas / Bank',
                'amount' => number_format((float) $trx->amount, 2, '.', ''),
            ];

            return [
                'debit' => [$debitEntry],
                'credit' => [$creditEntry],
                'balanced' => true,
            ];
        }

        return ['debit' => [], 'credit' => [], 'balanced' => true];
    }
}

<?php

namespace App\Services;

use App\Models\Transaction;
use Carbon\Carbon;

class TransactionNumberService
{
    public static function generate(string $date): string
    {
        $year = Carbon::parse($date)->format('Y');
        $prefix = "TRX-{$year}-";

        $latest = Transaction::where('transaction_no', 'like', "{$prefix}%")
            ->orderBy('id', 'desc')
            ->first();

        if ($latest) {
            $lastNumber = (int) substr($latest->transaction_no, -6);
            $nextNumber = str_pad((string) ($lastNumber + 1), 6, '0', STR_PAD_LEFT);
        } else {
            $nextNumber = '000001';
        }

        return "{$prefix}{$nextNumber}";
    }
}

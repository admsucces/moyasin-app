<?php

namespace App\Services;

use App\Models\Journal;
use Carbon\Carbon;

class JournalNumberService
{
    public static function generate(?string $dateString = null): string
    {
        $date = $dateString ? Carbon::parse($dateString) : Carbon::now();
        $year = $date->format('Y');
        $prefix = "JRN-{$year}-";

        $lastJournal = Journal::where('journal_no', 'like', "{$prefix}%")
            ->orderBy('id', 'desc')
            ->first();

        if (!$lastJournal) {
            return "{$prefix}000001";
        }

        $lastNumberStr = substr($lastJournal->journal_no, strlen($prefix));
        $nextNumber = ((int) $lastNumberStr) + 1;

        return $prefix . str_pad((string) $nextNumber, 6, '0', STR_PAD_LEFT);
    }
}

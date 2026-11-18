<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Donor;
use App\Models\JournalEntry;
use App\Models\Program;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class ManagementReportService
{
    /**
     * Generate Laporan Manajerial & Rekap Operational (DEV-095).
     *
     * @param string|null $startDate
     * @param string|null $endDate
     * @return array
     */
    public static function getManagementSummary(?string $startDate = null, ?string $endDate = null): array
    {
        $startDate = $startDate ?: date('Y-01-01');
        $endDate = $endDate ?: date('Y-m-d');

        // 1. Expense Breakdown by Program
        $programs = Program::all();
        $expenseByProgram = [];
        $totalProgramExpense = 0.00;

        foreach ($programs as $program) {
            $entries = JournalEntry::where('program_id', $program->id)
                ->whereHas('account', function ($a) {
                    $a->where('type', 'EXPENSE');
                })->whereHas('journal', function ($j) use ($startDate, $endDate) {
                    $j->where('status', 'POSTED')
                      ->whereDate('journal_date', '>=', $startDate)
                      ->whereDate('journal_date', '<=', $endDate);
                })->get();

            $amount = (float) $entries->sum('debit') - (float) $entries->sum('credit');

            if ($amount > 0) {
                $expenseByProgram[] = [
                    'program_id' => $program->id,
                    'code' => $program->code,
                    'name' => $program->name,
                    'amount' => round($amount, 2),
                ];
                $totalProgramExpense += $amount;
            }
        }

        // Unallocated / Non-program expenses
        $unallocatedEntries = JournalEntry::whereNull('program_id')
            ->whereHas('account', function ($a) {
                $a->where('type', 'EXPENSE');
            })->whereHas('journal', function ($j) use ($startDate, $endDate) {
                $j->where('status', 'POSTED')
                  ->whereDate('journal_date', '>=', $startDate)
                  ->whereDate('journal_date', '<=', $endDate);
            })->get();

        $unallocatedExpense = (float) $unallocatedEntries->sum('debit') - (float) $unallocatedEntries->sum('credit');
        if ($unallocatedExpense > 0) {
            $expenseByProgram[] = [
                'program_id' => null,
                'code' => 'GENERAL',
                'name' => 'Operasional Umum / Non-Program',
                'amount' => round($unallocatedExpense, 2),
            ];
            $totalProgramExpense += $unallocatedExpense;
        }

        // 2. Income Breakdown by Donor
        $donors = Donor::all();
        $incomeByDonor = [];
        $totalDonorIncome = 0.00;

        foreach ($donors as $donor) {
            $transactions = Transaction::where('donor_id', $donor->id)
                ->where('status', 'POSTED')
                ->whereDate('transaction_date', '>=', $startDate)
                ->whereDate('transaction_date', '<=', $endDate)
                ->where('type', 'INCOME')
                ->get();

            $amount = (float) $transactions->sum('amount');
            if ($amount > 0) {
                $incomeByDonor[] = [
                    'donor_id' => $donor->id,
                    'code' => $donor->code,
                    'name' => $donor->name,
                    'category' => $donor->category,
                    'amount' => round($amount, 2),
                ];
                $totalDonorIncome += $amount;
            }
        }

        // Non-donor / General Public Income
        $nonDonorTx = Transaction::whereNull('donor_id')
            ->where('status', 'POSTED')
            ->whereDate('transaction_date', '>=', $startDate)
            ->whereDate('transaction_date', '<=', $endDate)
            ->where('type', 'INCOME')
            ->get();

        $nonDonorIncome = (float) $nonDonorTx->sum('amount');
        if ($nonDonorIncome > 0) {
            $incomeByDonor[] = [
                'donor_id' => null,
                'code' => 'PUBLIC',
                'name' => 'Donatur Umum / Tanpa Identitas Terikat',
                'category' => 'PUBLIC',
                'amount' => round($nonDonorIncome, 2),
            ];
            $totalDonorIncome += $nonDonorIncome;
        }

        // 3. Restriction Type Breakdown
        $unrestrictedIncome = (float) Transaction::where('status', 'POSTED')
            ->whereDate('transaction_date', '>=', $startDate)
            ->whereDate('transaction_date', '<=', $endDate)
            ->where('type', 'INCOME')
            ->where(function ($q) {
                $q->where('restriction_type', 'WITHOUT_RESTRICTION')
                  ->orWhereNull('restriction_type');
            })->sum('amount');

        $restrictedIncome = (float) Transaction::where('status', 'POSTED')
            ->whereDate('transaction_date', '>=', $startDate)
            ->whereDate('transaction_date', '<=', $endDate)
            ->where('type', 'INCOME')
            ->where('restriction_type', 'WITH_RESTRICTION')
            ->sum('amount');

        return [
            'filter' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'expense_by_program' => [
                'items' => $expenseByProgram,
                'total' => round($totalProgramExpense, 2),
            ],
            'income_by_donor' => [
                'items' => $incomeByDonor,
                'total' => round($totalDonorIncome, 2),
            ],
            'fund_restriction_breakdown' => [
                'without_restriction' => round($unrestrictedIncome, 2),
                'with_restriction' => round($restrictedIncome, 2),
                'total' => round($unrestrictedIncome + $restrictedIncome, 2),
            ],
        ];
    }
}

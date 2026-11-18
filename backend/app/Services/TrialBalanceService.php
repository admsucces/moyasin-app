<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\Journal;
use App\Models\JournalEntry;
use Illuminate\Support\Facades\DB;

class TrialBalanceService
{
    /**
     * Generate Trial Balance statement for a given date range or period.
     * Only POSTED journals are included.
     */
    public static function getTrialBalance(?string $dateFrom = null, ?string $dateTo = null, ?int $accountingPeriodId = null): array
    {
        // If accounting period ID passed, override date range with period dates
        $periodName = null;
        if ($accountingPeriodId) {
            $period = AccountingPeriod::find($accountingPeriodId);
            if ($period) {
                $dateFrom = $period->start_date->format('Y-m-d');
                $dateTo = $period->end_date->format('Y-m-d');
                $periodName = $period->period_name;
            }
        }

        // Get all postable active accounts
        $accounts = Account::where('is_postable', true)
            ->where('is_active', true)
            ->orderBy('code', 'asc')
            ->get();

        $rows = [];
        $totalOpeningDebit = 0.00;
        $totalOpeningCredit = 0.00;
        $totalPeriodDebit = 0.00;
        $totalPeriodCredit = 0.00;
        $totalEndingDebit = 0.00;
        $totalEndingCredit = 0.00;

        foreach ($accounts as $account) {
            // 1. Opening Balance calculation (prior to $dateFrom)
            $openingDebit = 0.00;
            $openingCredit = 0.00;
            if ($dateFrom) {
                $qOpening = JournalEntry::where('account_id', $account->id)
                    ->whereHas('journal', function ($q) use ($dateFrom) {
                        $q->where('status', 'POSTED')
                          ->where('journal_date', '<', $dateFrom);
                    });
                $openingDebit = (float) $qOpening->sum('debit');
                $openingCredit = (float) $qOpening->sum('credit');
            }

            $openingNet = 0.00;
            if ($account->normal_balance === 'DEBIT') {
                $openingNet = $openingDebit - $openingCredit;
                $openingDebitVal = $openingNet >= 0 ? $openingNet : 0.00;
                $openingCreditVal = $openingNet < 0 ? abs($openingNet) : 0.00;
            } else {
                $openingNet = $openingCredit - $openingDebit;
                $openingCreditVal = $openingNet >= 0 ? $openingNet : 0.00;
                $openingDebitVal = $openingNet < 0 ? abs($openingNet) : 0.00;
            }

            // 2. Period movement calculation (between $dateFrom & $dateTo)
            $qPeriod = JournalEntry::where('account_id', $account->id)
                ->whereHas('journal', function ($q) use ($dateFrom, $dateTo) {
                    $q->where('status', 'POSTED');
                    if ($dateFrom) {
                        $q->where('journal_date', '>=', $dateFrom);
                    }
                    if ($dateTo) {
                        $q->where('journal_date', '<=', $dateTo);
                    }
                });

            $periodDebit = (float) $qPeriod->sum('debit');
            $periodCredit = (float) $qPeriod->sum('credit');

            // 3. Ending Balance calculation
            $endingDebitVal = 0.00;
            $endingCreditVal = 0.00;

            if ($account->normal_balance === 'DEBIT') {
                $endingNet = $openingNet + $periodDebit - $periodCredit;
                if ($endingNet >= 0) {
                    $endingDebitVal = $endingNet;
                } else {
                    $endingCreditVal = abs($endingNet);
                }
            } else {
                $endingNet = $openingNet + $periodCredit - $periodDebit;
                if ($endingNet >= 0) {
                    $endingCreditVal = $endingNet;
                } else {
                    $endingDebitVal = abs($endingNet);
                }
            }

            // Skip zero balance accounts if there was no opening and no period activity
            if ($openingNet == 0 && $periodDebit == 0 && $periodCredit == 0 && $endingNet == 0) {
                // We can include all accounts or only active ones. Including all for completeness:
            }

            $totalOpeningDebit += $openingDebitVal;
            $totalOpeningCredit += $openingCreditVal;
            $totalPeriodDebit += $periodDebit;
            $totalPeriodCredit += $periodCredit;
            $totalEndingDebit += $endingDebitVal;
            $totalEndingCredit += $endingCreditVal;

            $rows[] = [
                'account_id' => $account->id,
                'account_code' => $account->code,
                'account_name' => $account->name,
                'account_type' => $account->type,
                'category' => $account->category ?? $account->type,
                'normal_balance' => $account->normal_balance,
                'opening_debit' => round($openingDebitVal, 2),
                'opening_credit' => round($openingCreditVal, 2),
                'period_debit' => round($periodDebit, 2),
                'period_credit' => round($periodCredit, 2),
                'ending_debit' => round($endingDebitVal, 2),
                'ending_credit' => round($endingCreditVal, 2),
            ];
        }

        $diff = abs($totalEndingDebit - $totalEndingCredit);
        $isBalanced = $diff < 0.01;

        return [
            'filter' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'accounting_period_id' => $accountingPeriodId,
                'period_name' => $periodName,
            ],
            'summary' => [
                'total_opening_debit' => round($totalOpeningDebit, 2),
                'total_opening_credit' => round($totalOpeningCredit, 2),
                'total_period_debit' => round($totalPeriodDebit, 2),
                'total_period_credit' => round($totalPeriodCredit, 2),
                'total_ending_debit' => round($totalEndingDebit, 2),
                'total_ending_credit' => round($totalEndingCredit, 2),
                'difference' => round($diff, 2),
                'is_balanced' => $isBalanced,
            ],
            'accounts' => $rows,
        ];
    }

    /**
     * Generate Post-Closing Trial Balance (Neraca Saldo Setelah Penutupan Buku / Neraca Penutup).
     * Includes all accounts with 12-month columns (Januari - Desember) and year filter, exactly matching ISAK 35 nrcpntp.md.
     */
    public static function getPostClosingTrialBalance(?int $accountingPeriodId = null, ?string $asOfDate = null, ?int $year = null): array
    {
        $period = null;
        if ($accountingPeriodId) {
            $period = AccountingPeriod::find($accountingPeriodId);
            if ($period) {
                $asOfDate = $period->end_date->format('Y-m-d');
                $year = (int) $period->end_date->format('Y');
            }
        }

        if ($asOfDate && !$year) {
            $year = (int) date('Y', strtotime($asOfDate));
        }

        $year = $year ?: (int) date('Y');

        $months = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];

        // 1. Available years for dropdown filter
        $currYear = (int) date('Y');
        $availableYears = [$currYear - 2, $currYear - 1, $currYear, $currYear + 1];
        try {
            $journalYears = Journal::whereNotNull('journal_date')
                ->selectRaw('DISTINCT ' . (DB::getDriverName() === 'sqlite' ? 'strftime("%Y", journal_date)' : 'YEAR(journal_date)') . ' as yr')
                ->pluck('yr')
                ->filter()
                ->map(fn($y) => (int)$y)
                ->toArray();
            $availableYears = array_unique(array_merge($availableYears, $journalYears));
        } catch (\Throwable $e) {
            // fallback to default years array
        }
        rsort($availableYears);

        // 2. Fetch all entries up to end of $year in one batch for performance
        $endOfYear = "{$year}-12-31";
        $allEntries = JournalEntry::whereHas('journal', function ($j) use ($endOfYear) {
            $j->where('status', 'POSTED')
              ->whereDate('journal_date', '<=', $endOfYear);
        })->with(['journal:id,journal_date,status,transaction_id', 'journal.transaction:id,restriction_type', 'account:id,type'])
          ->get();

        // 3. Pre-calculate month surplus / net income
        $monthSurplus = [];
        foreach ($months as $m => $mName) {
            $lastDay = date('t', strtotime("{$year}-{$m}-01"));
            $cutOff = sprintf('%04d-%02d-%02d', $year, $m, $lastDay);

            $monthEntries = $allEntries->filter(function ($e) use ($cutOff) {
                return $e->journal && $e->journal->journal_date && $e->journal->journal_date->format('Y-m-d') <= $cutOff;
            });

            $unrestrictedIncome = 0.00;
            $restrictedIncome = 0.00;
            $expenses = 0.00;

            foreach ($monthEntries as $entry) {
                $accType = $entry->account?->type;
                if ($accType === 'INCOME') {
                    $net = (float) $entry->credit - (float) $entry->debit;
                    if ($entry->journal?->transaction?->restriction_type === 'WITH_RESTRICTION') {
                        $restrictedIncome += $net;
                    } else {
                        $unrestrictedIncome += $net;
                    }
                } elseif ($accType === 'EXPENSE') {
                    $expenses += ((float) $entry->debit - (float) $entry->credit);
                }
            }

            $monthSurplus[$m] = [
                'cut_off' => $cutOff,
                'unrestricted' => $unrestrictedIncome - $expenses,
                'restricted' => $restrictedIncome,
            ];
        }

        // 4. Fetch all accounts (both header and postable) ordered by code
        $accounts = Account::orderBy('code', 'asc')->get();

        $rows = [];
        $monthlyTotals = [];
        foreach ($months as $m => $mName) {
            $monthlyTotals[$m] = [
                'month_id' => $m,
                'month_name' => $mName,
                'debit' => 0.00,
                'credit' => 0.00,
                'difference' => 0.00,
                'is_balanced' => true,
            ];
        }

        $typeNames = [
            'ASSET' => 'Aktiva',
            'LIABILITY' => 'Liabilitas',
            'EQUITY' => 'Aset Neto',
            'INCOME' => 'Penerimaan',
            'EXPENSE' => 'Beban',
        ];

        foreach ($accounts as $account) {
            $category = ReportMappingService::getBalanceSheetCategory($account);
            $accEntries = $allEntries->where('account_id', $account->id);

            $accountRow = [
                'id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'type' => $account->type,
                'type_label' => $typeNames[$account->type] ?? $account->type,
                'category' => $category,
                'normal_balance' => $account->normal_balance,
                'is_postable' => (bool) $account->is_postable,
                'parent_id' => $account->parent_id,
                'months' => [],
            ];

            foreach ($months as $m => $mName) {
                $cutOff = $monthSurplus[$m]['cut_off'];
                $debitVal = 0.00;
                $creditVal = 0.00;

                if ($account->is_postable) {
                    if (in_array($account->type, ['INCOME', 'EXPENSE'])) {
                        // Nominal accounts are closed (0 / -)
                        $debitVal = 0.00;
                        $creditVal = 0.00;
                    } else {
                        // Real accounts (ASSET, LIABILITY, EQUITY)
                        $subEntries = $accEntries->filter(function ($e) use ($cutOff) {
                            return $e->journal && $e->journal->journal_date && $e->journal->journal_date->format('Y-m-d') <= $cutOff;
                        });

                        $d = (float) $subEntries->sum('debit');
                        $c = (float) $subEntries->sum('credit');

                        $baseBalance = ($account->normal_balance === 'DEBIT') ? ($d - $c) : ($c - $d);
                        $finalBalance = $baseBalance;

                        if ($account->type === 'EQUITY') {
                            if ($category === 'RESTRICTED_NET_ASSETS') {
                                $finalBalance += $monthSurplus[$m]['restricted'];
                            } elseif ($category === 'UNRESTRICTED_NET_ASSETS') {
                                $finalBalance += $monthSurplus[$m]['unrestricted'];
                            }
                        }

                        if ($account->normal_balance === 'DEBIT') {
                            if ($finalBalance >= 0) {
                                $debitVal = $finalBalance;
                            } else {
                                $creditVal = abs($finalBalance);
                            }
                        } else {
                            if ($finalBalance >= 0) {
                                $creditVal = $finalBalance;
                            } else {
                                $debitVal = abs($finalBalance);
                            }
                        }
                    }
                }

                $accountRow['months'][$m] = [
                    'debit' => round($debitVal, 2),
                    'credit' => round($creditVal, 2),
                ];

                if ($account->is_postable) {
                    $monthlyTotals[$m]['debit'] += $debitVal;
                    $monthlyTotals[$m]['credit'] += $creditVal;
                }
            }

            $rows[] = $accountRow;
        }

        // Finalize monthly totals and balance check
        foreach ($months as $m => $mName) {
            $d = round($monthlyTotals[$m]['debit'], 2);
            $c = round($monthlyTotals[$m]['credit'], 2);
            $diff = round(abs($d - $c), 2);
            $monthlyTotals[$m]['debit'] = $d;
            $monthlyTotals[$m]['credit'] = $c;
            $monthlyTotals[$m]['difference'] = $diff;
            $monthlyTotals[$m]['is_balanced'] = ($diff < 0.01);
        }

        // Current / latest month summary
        $currentMonth = (int) date('n');
        if ($year < $currYear) {
            $currentMonth = 12;
        } elseif ($year > $currYear) {
            $currentMonth = 1;
        }

        $latestMonthTotal = $monthlyTotals[$currentMonth] ?? $monthlyTotals[12];

        return [
            'year' => $year,
            'available_years' => array_values($availableYears),
            'current_month' => $currentMonth,
            'period' => $period ? [
                'id' => $period->id,
                'name' => $period->name,
                'period_name' => $period->name,
                'status' => $period->status,
                'start_date' => $period->start_date ? $period->start_date->format('Y-m-d') : null,
                'end_date' => $period->end_date ? $period->end_date->format('Y-m-d') : null,
            ] : null,
            'months' => array_map(function ($id, $name) {
                return ['id' => $id, 'name' => $name];
            }, array_keys($months), array_values($months)),
            'monthly_totals' => $monthlyTotals,
            'summary' => [
                'year' => $year,
                'total_debit' => $latestMonthTotal['debit'],
                'total_credit' => $latestMonthTotal['credit'],
                'difference' => $latestMonthTotal['difference'],
                'is_balanced' => $latestMonthTotal['is_balanced'],
                'total_accounts' => count($rows),
            ],
            'accounts' => $rows,
        ];
    }
}

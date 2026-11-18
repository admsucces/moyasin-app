<?php

namespace App\Services;

use App\Models\Account;
use App\Models\JournalEntry;
use Illuminate\Support\Facades\DB;

class FinancialReportService
{
    /**
     * Generate Laporan Posisi Keuangan (Balance Sheet / Statement of Financial Position).
     *
     * @param string|null $asOfDate
     * @return array
     */
    public static function getBalanceSheet(?string $asOfDate = null): array
    {
        $asOfDate = $asOfDate ?: date('Y-m-d');

        // Fetch all active postable accounts
        $accounts = Account::where('is_postable', true)
            ->where('is_active', true)
            ->orderBy('code', 'asc')
            ->get();

        $currentAssets = [];
        $nonCurrentAssets = [];
        $shortTermLiabilities = [];
        $longTermLiabilities = [];

        $totalCurrentAssets = 0.00;
        $totalNonCurrentAssets = 0.00;
        $totalShortTermLiabilities = 0.00;
        $totalLongTermLiabilities = 0.00;

        $baseUnrestrictedNetAssets = 0.00;
        $baseRestrictedNetAssets = 0.00;

        foreach ($accounts as $account) {
            $entries = JournalEntry::where('account_id', $account->id)
                ->whereHas('journal', function ($j) use ($asOfDate) {
                    $j->where('status', 'POSTED')
                      ->whereDate('journal_date', '<=', $asOfDate);
                })->get();

            $totalDebit = (float) $entries->sum('debit');
            $totalCredit = (float) $entries->sum('credit');

            if ($account->normal_balance === 'DEBIT') {
                $balance = $totalDebit - $totalCredit;
            } else {
                $balance = $totalCredit - $totalDebit;
            }

            $category = ReportMappingService::getBalanceSheetCategory($account);

            $item = [
                'account_id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'type' => $account->type,
                'balance' => round($balance, 2),
            ];

            switch ($category) {
                case 'CURRENT_ASSET':
                    $currentAssets[] = $item;
                    $totalCurrentAssets += $balance;
                    break;
                case 'NON_CURRENT_ASSET':
                    $nonCurrentAssets[] = $item;
                    $totalNonCurrentAssets += $balance;
                    break;
                case 'SHORT_TERM_LIABILITY':
                    $shortTermLiabilities[] = $item;
                    $totalShortTermLiabilities += $balance;
                    break;
                case 'LONG_TERM_LIABILITY':
                    $longTermLiabilities[] = $item;
                    $totalLongTermLiabilities += $balance;
                    break;
                case 'UNRESTRICTED_NET_ASSETS':
                    $baseUnrestrictedNetAssets += $balance;
                    break;
                case 'RESTRICTED_NET_ASSETS':
                    $baseRestrictedNetAssets += $balance;
                    break;
            }
        }

        $totalAssets = $totalCurrentAssets + $totalNonCurrentAssets;
        $totalLiabilities = $totalShortTermLiabilities + $totalLongTermLiabilities;

        // Calculate Retained Surplus/Deficit up to $asOfDate
        $incomeEntries = JournalEntry::whereHas('account', function ($a) {
            $a->where('type', 'INCOME');
        })->whereHas('journal', function ($j) use ($asOfDate) {
            $j->where('status', 'POSTED')->whereDate('journal_date', '<=', $asOfDate);
        })->with('journal.transaction')->get();

        $cumulativeIncomeUnrestricted = 0.00;
        $cumulativeIncomeRestricted = 0.00;

        foreach ($incomeEntries as $iEntry) {
            $net = (float) $iEntry->credit - (float) $iEntry->debit;
            if ($iEntry->journal->transaction?->restriction_type === 'WITH_RESTRICTION') {
                $cumulativeIncomeRestricted += $net;
            } else {
                $cumulativeIncomeUnrestricted += $net;
            }
        }

        $expenseEntries = JournalEntry::whereHas('account', function ($a) {
            $a->where('type', 'EXPENSE');
        })->whereHas('journal', function ($j) use ($asOfDate) {
            $j->where('status', 'POSTED')->whereDate('journal_date', '<=', $asOfDate);
        })->get();

        $cumulativeExpenses = (float) $expenseEntries->sum('debit') - (float) $expenseEntries->sum('credit');

        // Net assets surplus calculation
        $unrestrictedNetAssets = $baseUnrestrictedNetAssets + ($cumulativeIncomeUnrestricted - $cumulativeExpenses);
        $restrictedNetAssets = $baseRestrictedNetAssets + $cumulativeIncomeRestricted;
        $totalNetAssets = $unrestrictedNetAssets + $restrictedNetAssets;

        $totalLiabilitiesAndNetAssets = $totalLiabilities + $totalNetAssets;
        $difference = abs($totalAssets - $totalLiabilitiesAndNetAssets);
        $isBalanced = $difference < 0.01;

        return [
            'as_of_date' => $asOfDate,
            'assets' => [
                'current_assets' => $currentAssets,
                'total_current_assets' => round($totalCurrentAssets, 2),
                'non_current_assets' => $nonCurrentAssets,
                'total_non_current_assets' => round($totalNonCurrentAssets, 2),
                'total_assets' => round($totalAssets, 2),
            ],
            'liabilities' => [
                'short_term_liabilities' => $shortTermLiabilities,
                'total_short_term_liabilities' => round($totalShortTermLiabilities, 2),
                'long_term_liabilities' => $longTermLiabilities,
                'total_long_term_liabilities' => round($totalLongTermLiabilities, 2),
                'total_liabilities' => round($totalLiabilities, 2),
            ],
            'net_assets' => [
                'unrestricted_net_assets' => round($unrestrictedNetAssets, 2),
                'restricted_net_assets' => round($restrictedNetAssets, 2),
                'total_net_assets' => round($totalNetAssets, 2),
            ],
            'total_liabilities_and_net_assets' => round($totalLiabilitiesAndNetAssets, 2),
            'difference' => round($difference, 2),
            'is_balanced' => $isBalanced,
        ];
    }

    public static function getMonthName(int $month): string
    {
        $months = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];
        return $months[$month] ?? '';
    }

    private static function mergeAccountList(array $currentList, array $compList): array
    {
        $map = [];
        foreach ($currentList as $ci) {
            $map[$ci['account_id']] = [
                'account_id' => $ci['account_id'],
                'code' => $ci['code'],
                'name' => $ci['name'],
                'type' => $ci['type'],
                'current_balance' => (float) $ci['balance'],
                'comparison_balance' => 0.00,
            ];
        }
        foreach ($compList as $co) {
            if (!isset($map[$co['account_id']])) {
                $map[$co['account_id']] = [
                    'account_id' => $co['account_id'],
                    'code' => $co['code'],
                    'name' => $co['name'],
                    'type' => $co['type'],
                    'current_balance' => 0.00,
                    'comparison_balance' => (float) $co['balance'],
                ];
            } else {
                $map[$co['account_id']]['comparison_balance'] = (float) $co['balance'];
            }
        }

        $result = [];
        foreach ($map as $item) {
            $diff = round($item['current_balance'] - $item['comparison_balance'], 2);
            $pct = $item['comparison_balance'] != 0.00 
                ? round(($diff / abs($item['comparison_balance'])) * 100, 2) 
                : ($item['current_balance'] != 0.00 ? 100.00 : 0.00);

            $result[] = [
                'account_id' => $item['account_id'],
                'code' => $item['code'],
                'name' => $item['name'],
                'type' => $item['type'],
                'current_balance' => round($item['current_balance'], 2),
                'comparison_balance' => round($item['comparison_balance'], 2),
                'variance' => $diff,
                'percentage' => $pct,
            ];
        }

        usort($result, fn($a, $b) => strcmp($a['code'], $b['code']));
        return $result;
    }

    private static function calcTotalVariance(float $current, float $comparison): array
    {
        $diff = round($current - $comparison, 2);
        $pct = $comparison != 0.00 
            ? round(($diff / abs($comparison)) * 100, 2) 
            : ($current != 0.00 ? 100.00 : 0.00);

        return [
            'current' => round($current, 2),
            'comparison' => round($comparison, 2),
            'variance' => $diff,
            'percentage' => $pct,
        ];
    }

    /**
     * Generate Comparative Laporan Posisi Keuangan (Balance Sheet).
     */
    public static function getComparativeBalanceSheet(
        ?int $month = null,
        ?int $year = null,
        ?string $asOfDate = null,
        string $compareMode = 'NONE',
        ?int $compareMonth = null,
        ?int $compareYear = null
    ): array {
        // Determine primary period date
        if ($month && $year) {
            $lastDay = date('t', strtotime(sprintf('%04d-%02d-01', $year, $month)));
            $currentDate = sprintf('%04d-%02d-%02d', $year, $month, $lastDay);
        } elseif ($asOfDate) {
            $currentDate = $asOfDate;
            $month = (int) date('m', strtotime($asOfDate));
            $year = (int) date('Y', strtotime($asOfDate));
        } else {
            $year = (int) date('Y');
            $month = (int) date('m');
            $lastDay = date('t', strtotime(sprintf('%04d-%02d-01', $year, $month)));
            $currentDate = sprintf('%04d-%02d-%02d', $year, $month, $lastDay);
        }

        $currentBs = self::getBalanceSheet($currentDate);

        if ($compareMode === 'NONE' || !$compareMode) {
            return array_merge($currentBs, [
                'is_comparative' => false,
                'filter' => [
                    'month' => $month,
                    'year' => $year,
                    'as_of_date' => $currentDate,
                    'compare_mode' => 'NONE',
                ],
                'current_period' => [
                    'month' => $month,
                    'year' => $year,
                    'as_of_date' => $currentDate,
                    'label' => self::getMonthName($month) . ' ' . $year,
                ],
            ]);
        }

        // Determine comparison period date
        $compMonth = $compareMonth;
        $compYear = $compareYear;

        if ($compareMode === 'PRIOR_MONTH') {
            if ($month === 1) {
                $compMonth = 12;
                $compYear = $year - 1;
            } else {
                $compMonth = $month - 1;
                $compYear = $year;
            }
        } elseif ($compareMode === 'PRIOR_YEAR') {
            $compMonth = $month;
            $compYear = $year - 1;
        }

        $compMonth = $compMonth ?: $month;
        $compYear = $compYear ?: $year;
        $compLastDay = date('t', strtotime(sprintf('%04d-%02d-01', $compYear, $compMonth)));
        $compDate = sprintf('%04d-%02d-%02d', $compYear, $compMonth, $compLastDay);

        $compBs = self::getBalanceSheet($compDate);

        // Comparative items
        $currAssetsMerged = self::mergeAccountList($currentBs['assets']['current_assets'], $compBs['assets']['current_assets']);
        $nonCurrAssetsMerged = self::mergeAccountList($currentBs['assets']['non_current_assets'], $compBs['assets']['non_current_assets']);
        $shortTermLiabMerged = self::mergeAccountList($currentBs['liabilities']['short_term_liabilities'], $compBs['liabilities']['short_term_liabilities']);
        $longTermLiabMerged = self::mergeAccountList($currentBs['liabilities']['long_term_liabilities'], $compBs['liabilities']['long_term_liabilities']);

        return array_merge($currentBs, [
            'is_comparative' => true,
            'filter' => [
                'month' => $month,
                'year' => $year,
                'as_of_date' => $currentDate,
                'compare_mode' => $compareMode,
                'compare_month' => $compMonth,
                'compare_year' => $compYear,
            ],
            'current_period' => [
                'month' => $month,
                'year' => $year,
                'as_of_date' => $currentDate,
                'label' => self::getMonthName($month) . ' ' . $year,
                'data' => $currentBs,
            ],
            'comparison_period' => [
                'month' => $compMonth,
                'year' => $compYear,
                'as_of_date' => $compDate,
                'label' => self::getMonthName($compMonth) . ' ' . $compYear,
                'data' => $compBs,
            ],
            'comparative_data' => [
                'assets' => [
                    'current_assets' => $currAssetsMerged,
                    'total_current_assets' => self::calcTotalVariance($currentBs['assets']['total_current_assets'], $compBs['assets']['total_current_assets']),
                    'non_current_assets' => $nonCurrAssetsMerged,
                    'total_non_current_assets' => self::calcTotalVariance($currentBs['assets']['total_non_current_assets'], $compBs['assets']['total_non_current_assets']),
                    'total_assets' => self::calcTotalVariance($currentBs['assets']['total_assets'], $compBs['assets']['total_assets']),
                ],
                'liabilities' => [
                    'short_term_liabilities' => $shortTermLiabMerged,
                    'total_short_term_liabilities' => self::calcTotalVariance($currentBs['liabilities']['total_short_term_liabilities'], $compBs['liabilities']['total_short_term_liabilities']),
                    'long_term_liabilities' => $longTermLiabMerged,
                    'total_long_term_liabilities' => self::calcTotalVariance($currentBs['liabilities']['total_long_term_liabilities'], $compBs['liabilities']['total_long_term_liabilities']),
                    'total_liabilities' => self::calcTotalVariance($currentBs['liabilities']['total_liabilities'], $compBs['liabilities']['total_liabilities']),
                ],
                'net_assets' => [
                    'unrestricted_net_assets' => self::calcTotalVariance($currentBs['net_assets']['unrestricted_net_assets'], $compBs['net_assets']['unrestricted_net_assets']),
                    'restricted_net_assets' => self::calcTotalVariance($currentBs['net_assets']['restricted_net_assets'], $compBs['net_assets']['restricted_net_assets']),
                    'total_net_assets' => self::calcTotalVariance($currentBs['net_assets']['total_net_assets'], $compBs['net_assets']['total_net_assets']),
                ],
                'total_liabilities_and_net_assets' => self::calcTotalVariance($currentBs['total_liabilities_and_net_assets'], $compBs['total_liabilities_and_net_assets']),
            ],
        ]);
    }

    /**
     * Generate Laporan Penghasilan Komprehensif (Income Statement / Statement of Activities).
     *
     * @param string|null $startDate
     * @param string|null $endDate
     * @return array
     */
    public static function getIncomeStatement(?string $startDate = null, ?string $endDate = null): array
    {
        $startDate = $startDate ?: date('Y-01-01');
        $endDate = $endDate ?: date('Y-m-d');

        $incomeEntries = JournalEntry::whereHas('account', function ($a) {
            $a->where('type', 'INCOME');
        })->whereHas('journal', function ($j) use ($startDate, $endDate) {
            $j->where('status', 'POSTED')
              ->whereDate('journal_date', '>=', $startDate)
              ->whereDate('journal_date', '<=', $endDate);
        })->with(['account', 'journal.transaction'])->get();

        $unrestrictedMap = [];
        $restrictedMap = [];

        $totalUnrestrictedRevenue = 0.00;
        $totalRestrictedRevenue = 0.00;

        foreach ($incomeEntries as $entry) {
            $net = (float) $entry->credit - (float) $entry->debit;
            $accId = $entry->account_id;
            $accCode = $entry->account->code;
            $accName = $entry->account->name;

            $isRestricted = ($entry->journal->transaction?->restriction_type === 'WITH_RESTRICTION');

            if ($isRestricted) {
                if (!isset($restrictedMap[$accId])) {
                    $restrictedMap[$accId] = ['account_id' => $accId, 'code' => $accCode, 'name' => $accName, 'amount' => 0.00];
                }
                $restrictedMap[$accId]['amount'] += $net;
                $totalRestrictedRevenue += $net;
            } else {
                if (!isset($unrestrictedMap[$accId])) {
                    $unrestrictedMap[$accId] = ['account_id' => $accId, 'code' => $accCode, 'name' => $accName, 'amount' => 0.00];
                }
                $unrestrictedMap[$accId]['amount'] += $net;
                $totalUnrestrictedRevenue += $net;
            }
        }

        $totalRevenue = $totalUnrestrictedRevenue + $totalRestrictedRevenue;

        $expenseEntries = JournalEntry::whereHas('account', function ($a) {
            $a->where('type', 'EXPENSE');
        })->whereHas('journal', function ($j) use ($startDate, $endDate) {
            $j->where('status', 'POSTED')
              ->whereDate('journal_date', '>=', $startDate)
              ->whereDate('journal_date', '<=', $endDate);
        })->with('account')->get();

        $programExpensesMap = [];
        $managementExpensesMap = [];
        $fundraisingExpensesMap = [];

        $totalProgramExpense = 0.00;
        $totalManagementExpense = 0.00;
        $totalFundraisingExpense = 0.00;

        foreach ($expenseEntries as $entry) {
            $net = (float) $entry->debit - (float) $entry->credit;
            $accId = $entry->account_id;
            $accCode = $entry->account->code;
            $accName = $entry->account->name;
            $category = ReportMappingService::getIncomeStatementCategory($entry->account);

            if ($category === 'EXPENSE_MANAGEMENT_GENERAL') {
                if (!isset($managementExpensesMap[$accId])) {
                    $managementExpensesMap[$accId] = ['account_id' => $accId, 'code' => $accCode, 'name' => $accName, 'amount' => 0.00];
                }
                $managementExpensesMap[$accId]['amount'] += $net;
                $totalManagementExpense += $net;
            } elseif ($category === 'EXPENSE_FUNDRAISING') {
                if (!isset($fundraisingExpensesMap[$accId])) {
                    $fundraisingExpensesMap[$accId] = ['account_id' => $accId, 'code' => $accCode, 'name' => $accName, 'amount' => 0.00];
                }
                $fundraisingExpensesMap[$accId]['amount'] += $net;
                $totalFundraisingExpense += $net;
            } else {
                if (!isset($programExpensesMap[$accId])) {
                    $programExpensesMap[$accId] = ['account_id' => $accId, 'code' => $accCode, 'name' => $accName, 'amount' => 0.00];
                }
                $programExpensesMap[$accId]['amount'] += $net;
                $totalProgramExpense += $net;
            }
        }

        $totalExpense = $totalProgramExpense + $totalManagementExpense + $totalFundraisingExpense;

        $unrestrictedSurplus = $totalUnrestrictedRevenue - $totalExpense;
        $restrictedSurplus = $totalRestrictedRevenue;
        $totalSurplus = $totalRevenue - $totalExpense;

        return [
            'filter' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'revenues' => [
                'unrestricted' => array_values($unrestrictedMap),
                'total_unrestricted' => round($totalUnrestrictedRevenue, 2),
                'restricted' => array_values($restrictedMap),
                'total_restricted' => round($totalRestrictedRevenue, 2),
                'total_revenue' => round($totalRevenue, 2),
            ],
            'expenses' => [
                'program' => array_values($programExpensesMap),
                'total_program' => round($totalProgramExpense, 2),
                'management' => array_values($managementExpensesMap),
                'total_management' => round($totalManagementExpense, 2),
                'fundraising' => array_values($fundraisingExpensesMap),
                'total_fundraising' => round($totalFundraisingExpense, 2),
                'total_expense' => round($totalExpense, 2),
            ],
            'surplus_deficit' => [
                'unrestricted' => round($unrestrictedSurplus, 2),
                'restricted' => round($restrictedSurplus, 2),
                'total_surplus' => round($totalSurplus, 2),
            ],
        ];
    }

    private static function mergeIncomeAccountList(array $currentList, array $compList): array
    {
        $map = [];
        foreach ($currentList as $ci) {
            $map[$ci['account_id']] = [
                'account_id' => $ci['account_id'],
                'code' => $ci['code'],
                'name' => $ci['name'],
                'current_amount' => (float) $ci['amount'],
                'comparison_amount' => 0.00,
            ];
        }
        foreach ($compList as $co) {
            if (!isset($map[$co['account_id']])) {
                $map[$co['account_id']] = [
                    'account_id' => $co['account_id'],
                    'code' => $co['code'],
                    'name' => $co['name'],
                    'current_amount' => 0.00,
                    'comparison_amount' => (float) $co['amount'],
                ];
            } else {
                $map[$co['account_id']]['comparison_amount'] = (float) $co['amount'];
            }
        }

        $result = [];
        foreach ($map as $item) {
            $diff = round($item['current_amount'] - $item['comparison_amount'], 2);
            $pct = $item['comparison_amount'] != 0.00 
                ? round(($diff / abs($item['comparison_amount'])) * 100, 2) 
                : ($item['current_amount'] != 0.00 ? 100.00 : 0.00);

            $result[] = [
                'account_id' => $item['account_id'],
                'code' => $item['code'],
                'name' => $item['name'],
                'current_amount' => round($item['current_amount'], 2),
                'comparison_amount' => round($item['comparison_amount'], 2),
                'variance' => $diff,
                'percentage' => $pct,
            ];
        }

        usort($result, fn($a, $b) => strcmp($a['code'], $b['code']));
        return $result;
    }

    /**
     * Generate Comparative Laporan Penghasilan Komprehensif (Income Statement).
     */
    public static function getComparativeIncomeStatement(
        ?int $month = null,
        ?int $year = null,
        string $periodType = 'MONTH',
        ?string $startDate = null,
        ?string $endDate = null,
        string $compareMode = 'NONE',
        ?int $compareMonth = null,
        ?int $compareYear = null
    ): array {
        // Determine primary period start & end dates
        if ($month && $year) {
            if ($periodType === 'YEAR') {
                $currStart = sprintf('%04d-01-01', $year);
                $currEnd = sprintf('%04d-12-31', $year);
                $label = "Tahun $year";
            } else {
                $lastDay = date('t', strtotime(sprintf('%04d-%02d-01', $year, $month)));
                $currStart = sprintf('%04d-%02d-01', $year, $month);
                $currEnd = sprintf('%04d-%02d-%02d', $year, $month, $lastDay);
                $label = self::getMonthName($month) . " $year";
            }
        } elseif ($startDate && $endDate) {
            $currStart = $startDate;
            $currEnd = $endDate;
            $month = (int) date('m', strtotime($startDate));
            $year = (int) date('Y', strtotime($startDate));
            $label = "$startDate s/d $endDate";
        } else {
            $year = (int) date('Y');
            $month = (int) date('m');
            $lastDay = date('t', strtotime(sprintf('%04d-%02d-01', $year, $month)));
            $currStart = sprintf('%04d-%02d-01', $year, $month);
            $currEnd = sprintf('%04d-%02d-%02d', $year, $month, $lastDay);
            $label = self::getMonthName($month) . " $year";
        }

        $currentIs = self::getIncomeStatement($currStart, $currEnd);

        if ($compareMode === 'RESTRICTION' || $compareMode === 'RESTRICTION_COMPARISON') {
            // Build comparative dataset between Unrestricted vs Restricted
            $allRevAccounts = [];
            foreach ($currentIs['revenues']['unrestricted'] as $u) {
                $accId = $u['account_id'];
                $allRevAccounts[$accId] = [
                    'account_id' => $accId,
                    'code' => $u['code'],
                    'name' => $u['name'],
                    'unrestricted' => (float) $u['amount'],
                    'restricted' => 0.00,
                    'total' => (float) $u['amount'],
                ];
            }
            foreach ($currentIs['revenues']['restricted'] as $r) {
                $accId = $r['account_id'];
                if (isset($allRevAccounts[$accId])) {
                    $allRevAccounts[$accId]['restricted'] = (float) $r['amount'];
                    $allRevAccounts[$accId]['total'] += (float) $r['amount'];
                } else {
                    $allRevAccounts[$accId] = [
                        'account_id' => $accId,
                        'code' => $r['code'],
                        'name' => $r['name'],
                        'unrestricted' => 0.00,
                        'restricted' => (float) $r['amount'],
                        'total' => (float) $r['amount'],
                    ];
                }
            }
            $totRev = (float) $currentIs['revenues']['total_revenue'];
            foreach ($allRevAccounts as &$item) {
                $item['percentage'] = $totRev > 0 ? round(($item['total'] / $totRev) * 100, 2) : 0.00;
            }
            unset($item);
            usort($allRevAccounts, fn($a, $b) => strcmp($a['code'], $b['code']));

            return array_merge($currentIs, [
                'is_comparative' => true,
                'compare_mode' => 'RESTRICTION',
                'filter' => [
                    'month' => $month,
                    'year' => $year,
                    'period_type' => $periodType,
                    'start_date' => $currStart,
                    'end_date' => $currEnd,
                    'compare_mode' => 'RESTRICTION',
                ],
                'current_period' => [
                    'month' => $month,
                    'year' => $year,
                    'label' => $label,
                    'start_date' => $currStart,
                    'end_date' => $currEnd,
                ],
                'restriction_comparison' => [
                    'revenues' => array_values($allRevAccounts),
                    'total_unrestricted_revenue' => $currentIs['revenues']['total_unrestricted'],
                    'total_restricted_revenue' => $currentIs['revenues']['total_restricted'],
                    'total_revenue' => $currentIs['revenues']['total_revenue'],
                    'expenses_program' => $currentIs['expenses']['program'],
                    'total_program_expense' => $currentIs['expenses']['total_program'],
                    'expenses_management' => $currentIs['expenses']['management'],
                    'total_management_expense' => $currentIs['expenses']['total_management'],
                    'total_expense' => $currentIs['expenses']['total_expense'],
                    'surplus_deficit' => $currentIs['surplus_deficit'],
                ],
            ]);
        }

        if ($compareMode === 'WITHOUT_RESTRICTION') {
            return array_merge($currentIs, [
                'is_comparative' => false,
                'compare_mode' => 'WITHOUT_RESTRICTION',
                'filter' => [
                    'month' => $month,
                    'year' => $year,
                    'period_type' => $periodType,
                    'start_date' => $currStart,
                    'end_date' => $currEnd,
                    'compare_mode' => 'WITHOUT_RESTRICTION',
                ],
                'current_period' => [
                    'month' => $month,
                    'year' => $year,
                    'label' => $label,
                    'start_date' => $currStart,
                    'end_date' => $currEnd,
                ],
            ]);
        }

        if ($compareMode === 'WITH_RESTRICTION') {
            return array_merge($currentIs, [
                'is_comparative' => false,
                'compare_mode' => 'WITH_RESTRICTION',
                'filter' => [
                    'month' => $month,
                    'year' => $year,
                    'period_type' => $periodType,
                    'start_date' => $currStart,
                    'end_date' => $currEnd,
                    'compare_mode' => 'WITH_RESTRICTION',
                ],
                'current_period' => [
                    'month' => $month,
                    'year' => $year,
                    'label' => $label,
                    'start_date' => $currStart,
                    'end_date' => $currEnd,
                ],
            ]);
        }

        if ($compareMode === 'MONTHLY_ANNUAL') {
            $year = $year ?: (int) date('Y');
            $months = [
                1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
                5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
                9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
            ];

            // 1. Available years
            $currYear = (int) date('Y');
            $availableYears = [$currYear - 2, $currYear - 1, $currYear, $currYear + 1];
            try {
                $journalYears = \App\Models\Journal::whereNotNull('journal_date')
                    ->selectRaw('DISTINCT ' . (DB::getDriverName() === 'sqlite' ? 'strftime("%Y", journal_date)' : 'YEAR(journal_date)') . ' as yr')
                    ->pluck('yr')
                    ->filter()
                    ->map(fn($y) => (int)$y)
                    ->toArray();
                $availableYears = array_unique(array_merge($availableYears, $journalYears));
            } catch (\Throwable $e) {
                // ignore
            }
            rsort($availableYears);

            // 2. Entries in target year
            $entries = JournalEntry::whereHas('account', function ($a) {
                $a->whereIn('type', ['INCOME', 'EXPENSE']);
            })->whereHas('journal', function ($j) use ($year) {
                $j->where('status', 'POSTED')
                  ->whereYear('journal_date', $year);
            })->with(['journal:id,journal_date,status', 'account:id,code,name,type,is_postable,parent_id'])
              ->get();

            // 3. Accounts
            $incomeAccounts = Account::where('type', 'INCOME')->orderBy('code', 'asc')->get();
            $expenseAccounts = Account::where('type', 'EXPENSE')->orderBy('code', 'asc')->get();

            $monthlyRevenues = array_fill(1, 12, 0.0);
            $monthlyExpenses = array_fill(1, 12, 0.0);

            $revRows = [];
            foreach ($incomeAccounts as $acc) {
                $row = [
                    'id' => $acc->id,
                    'code' => $acc->code,
                    'name' => $acc->name,
                    'is_postable' => (bool) $acc->is_postable,
                    'parent_id' => $acc->parent_id,
                    'months' => array_fill(1, 12, 0.0),
                    'total_year' => 0.0,
                ];
                if ($acc->is_postable) {
                    $accEntries = $entries->where('account_id', $acc->id);
                    foreach ($accEntries as $entry) {
                        $m = (int) $entry->journal->journal_date->format('n');
                        $net = (float) $entry->credit - (float) $entry->debit;
                        $row['months'][$m] += $net;
                        $row['total_year'] += $net;
                        $monthlyRevenues[$m] += $net;
                    }
                }
                foreach ($row['months'] as $m => $val) {
                    $row['months'][$m] = round($val, 2);
                }
                $row['total_year'] = round($row['total_year'], 2);
                $revRows[] = $row;
            }

            $expRows = [];
            foreach ($expenseAccounts as $acc) {
                $row = [
                    'id' => $acc->id,
                    'code' => $acc->code,
                    'name' => $acc->name,
                    'is_postable' => (bool) $acc->is_postable,
                    'parent_id' => $acc->parent_id,
                    'months' => array_fill(1, 12, 0.0),
                    'total_year' => 0.0,
                ];
                if ($acc->is_postable) {
                    $accEntries = $entries->where('account_id', $acc->id);
                    foreach ($accEntries as $entry) {
                        $m = (int) $entry->journal->journal_date->format('n');
                        $net = (float) $entry->debit - (float) $entry->credit;
                        $row['months'][$m] += $net;
                        $row['total_year'] += $net;
                        $monthlyExpenses[$m] += $net;
                    }
                }
                foreach ($row['months'] as $m => $val) {
                    $row['months'][$m] = round($val, 2);
                }
                $row['total_year'] = round($row['total_year'], 2);
                $expRows[] = $row;
            }

            $monthlySurplus = [];
            foreach ($months as $m => $mName) {
                $rev = round($monthlyRevenues[$m], 2);
                $exp = round($monthlyExpenses[$m], 2);
                $monthlyRevenues[$m] = $rev;
                $monthlyExpenses[$m] = $exp;
                $monthlySurplus[$m] = round($rev - $exp, 2);
            }

            $totalRevYear = round(array_sum($monthlyRevenues), 2);
            $totalExpYear = round(array_sum($monthlyExpenses), 2);
            $totalSurplusYear = round($totalRevYear - $totalExpYear, 2);

            return array_merge($currentIs, [
                'is_comparative' => true,
                'compare_mode' => 'MONTHLY_ANNUAL',
                'year' => $year,
                'available_years' => array_values($availableYears),
                'months' => array_map(fn($id, $name) => ['id' => $id, 'name' => $name], array_keys($months), array_values($months)),
                'filter' => [
                    'month' => $month,
                    'year' => $year,
                    'period_type' => 'YEAR',
                    'compare_mode' => 'MONTHLY_ANNUAL',
                ],
                'annual_statement' => [
                    'year' => $year,
                    'revenues' => [
                        'accounts' => $revRows,
                        'monthly_totals' => $monthlyRevenues,
                        'total_year' => $totalRevYear,
                    ],
                    'expenses' => [
                        'accounts' => $expRows,
                        'monthly_totals' => $monthlyExpenses,
                        'total_year' => $totalExpYear,
                    ],
                    'net_surplus' => [
                        'monthly_totals' => $monthlySurplus,
                        'total_year' => $totalSurplusYear,
                    ],
                ],
            ]);
        }

        if ($compareMode === 'NONE' || !$compareMode) {
            return array_merge($currentIs, [
                'is_comparative' => false,
                'filter' => [
                    'month' => $month,
                    'year' => $year,
                    'period_type' => $periodType,
                    'start_date' => $currStart,
                    'end_date' => $currEnd,
                    'compare_mode' => 'NONE',
                ],
                'current_period' => [
                    'month' => $month,
                    'year' => $year,
                    'label' => $label,
                    'start_date' => $currStart,
                    'end_date' => $currEnd,
                ],
            ]);
        }

        // Determine comparison period dates
        $compMonth = $compareMonth;
        $compYear = $compareYear;

        if ($compareMode === 'PRIOR_MONTH') {
            if ($month === 1) {
                $compMonth = 12;
                $compYear = $year - 1;
            } else {
                $compMonth = $month - 1;
                $compYear = $year;
            }
            $compLastDay = date('t', strtotime(sprintf('%04d-%02d-01', $compYear, $compMonth)));
            $compStart = sprintf('%04d-%02d-01', $compYear, $compMonth);
            $compEnd = sprintf('%04d-%02d-%02d', $compYear, $compMonth, $compLastDay);
            $compLabel = self::getMonthName($compMonth) . " $compYear";
        } elseif ($compareMode === 'PRIOR_YEAR') {
            $compYear = $year - 1;
            if ($periodType === 'YEAR') {
                $compStart = sprintf('%04d-01-01', $compYear);
                $compEnd = sprintf('%04d-12-31', $compYear);
                $compLabel = "Tahun $compYear";
            } else {
                $compMonth = $month;
                $compLastDay = date('t', strtotime(sprintf('%04d-%02d-01', $compYear, $compMonth)));
                $compStart = sprintf('%04d-%02d-01', $compYear, $compMonth);
                $compEnd = sprintf('%04d-%02d-%02d', $compYear, $compMonth, $compLastDay);
                $compLabel = self::getMonthName($compMonth) . " $compYear";
            }
        } else {
            // CUSTOM
            $compMonth = $compMonth ?: $month;
            $compYear = $compYear ?: $year;
            if ($periodType === 'YEAR') {
                $compStart = sprintf('%04d-01-01', $compYear);
                $compEnd = sprintf('%04d-12-31', $compYear);
                $compLabel = "Tahun $compYear";
            } else {
                $compLastDay = date('t', strtotime(sprintf('%04d-%02d-01', $compYear, $compMonth)));
                $compStart = sprintf('%04d-%02d-01', $compYear, $compMonth);
                $compEnd = sprintf('%04d-%02d-%02d', $compYear, $compMonth, $compLastDay);
                $compLabel = self::getMonthName($compMonth) . " $compYear";
            }
        }

        $compIs = self::getIncomeStatement($compStart, $compEnd);

        // Merge income statement sections
        $unrestrictedRevMerged = self::mergeIncomeAccountList($currentIs['revenues']['unrestricted'], $compIs['revenues']['unrestricted']);
        $restrictedRevMerged = self::mergeIncomeAccountList($currentIs['revenues']['restricted'], $compIs['revenues']['restricted']);
        $programExpMerged = self::mergeIncomeAccountList($currentIs['expenses']['program'], $compIs['expenses']['program']);
        $managementExpMerged = self::mergeIncomeAccountList($currentIs['expenses']['management'], $compIs['expenses']['management']);
        $fundraisingExpMerged = self::mergeIncomeAccountList($currentIs['expenses']['fundraising'], $compIs['expenses']['fundraising']);

        return array_merge($currentIs, [
            'is_comparative' => true,
            'filter' => [
                'month' => $month,
                'year' => $year,
                'period_type' => $periodType,
                'start_date' => $currStart,
                'end_date' => $currEnd,
                'compare_mode' => $compareMode,
                'compare_month' => $compMonth,
                'compare_year' => $compYear,
            ],
            'current_period' => [
                'month' => $month,
                'year' => $year,
                'label' => $label,
                'start_date' => $currStart,
                'end_date' => $currEnd,
                'data' => $currentIs,
            ],
            'comparison_period' => [
                'month' => $compMonth,
                'year' => $compYear,
                'label' => $compLabel,
                'start_date' => $compStart,
                'end_date' => $compEnd,
                'data' => $compIs,
            ],
            'comparative_data' => [
                'revenues' => [
                    'unrestricted' => $unrestrictedRevMerged,
                    'total_unrestricted' => self::calcTotalVariance($currentIs['revenues']['total_unrestricted'], $compIs['revenues']['total_unrestricted']),
                    'restricted' => $restrictedRevMerged,
                    'total_restricted' => self::calcTotalVariance($currentIs['revenues']['total_restricted'], $compIs['revenues']['total_restricted']),
                    'total_revenue' => self::calcTotalVariance($currentIs['revenues']['total_revenue'], $compIs['revenues']['total_revenue']),
                ],
                'expenses' => [
                    'program' => $programExpMerged,
                    'total_program' => self::calcTotalVariance($currentIs['expenses']['total_program'], $compIs['expenses']['total_program']),
                    'management' => $managementExpMerged,
                    'total_management' => self::calcTotalVariance($currentIs['expenses']['total_management'], $compIs['expenses']['total_management']),
                    'fundraising' => $fundraisingExpMerged,
                    'total_fundraising' => self::calcTotalVariance($currentIs['expenses']['total_fundraising'], $compIs['expenses']['total_fundraising']),
                    'total_expense' => self::calcTotalVariance($currentIs['expenses']['total_expense'], $compIs['expenses']['total_expense']),
                ],
                'surplus_deficit' => [
                    'unrestricted' => self::calcTotalVariance($currentIs['surplus_deficit']['unrestricted'], $compIs['surplus_deficit']['unrestricted']),
                    'restricted' => self::calcTotalVariance($currentIs['surplus_deficit']['restricted'], $compIs['surplus_deficit']['restricted']),
                    'total_surplus' => self::calcTotalVariance($currentIs['surplus_deficit']['total_surplus'], $compIs['surplus_deficit']['total_surplus']),
                ],
            ],
        ]);
    }

    /**
     * Generate Laporan Perubahan Aset Neto (Statement of Changes in Net Assets).
     *
     * @param string|null $startDate
     * @param string|null $endDate
     * @return array
     */
    public static function getChangesInNetAssets(?string $startDate = null, ?string $endDate = null): array
    {
        $startDate = $startDate ?: date('Y-01-01');
        $endDate = $endDate ?: date('Y-m-d');

        $year = (int) date('Y', strtotime($startDate));
        $fiscalYearStart = sprintf('%04d-01-01', $year);
        $priorYearEnd = sprintf('%04d-12-31', $year - 1);

        // Saldo Awal (Beginning Net Assets per 1 Jan tahun berjalan / per akhir tahun sebelumnya)
        $priorYearBs = self::getBalanceSheet($priorYearEnd);
        $begUnrestricted = (float) ($priorYearBs['net_assets']['unrestricted_net_assets'] ?? 0);
        $begRestricted = (float) ($priorYearBs['net_assets']['restricted_net_assets'] ?? 0);

        // Kenaikan (Penurunan) Periode Lalu: akumulasi surplus/defisit dari 1 Jan s/d sehari sebelum $startDate
        $priorUnrestricted = 0.00;
        $priorRestricted = 0.00;
        if ($startDate > $fiscalYearStart) {
            $priorDate = date('Y-m-d', strtotime($startDate . ' -1 day'));
            $priorIs = self::getIncomeStatement($fiscalYearStart, $priorDate);
            $priorUnrestricted = (float) ($priorIs['surplus_deficit']['unrestricted'] ?? 0);
            $priorRestricted = (float) ($priorIs['surplus_deficit']['restricted'] ?? 0);
        }

        // Kenaikan (Penurunan) Periode Berjalan: surplus/defisit dari $startDate s/d $endDate
        $is = self::getIncomeStatement($startDate, $endDate);
        $currUnrestricted = (float) ($is['surplus_deficit']['unrestricted'] ?? 0);
        $currRestricted = (float) ($is['surplus_deficit']['restricted'] ?? 0);

        // Aset Neto yang Dibebaskan dari Pembatasan (Reklasifikasi)
        $releasedUnrestricted = 0.00;
        $releasedRestricted = 0.00;

        // Saldo Akhir
        $endUnrestricted = round($begUnrestricted + $priorUnrestricted + $currUnrestricted + $releasedUnrestricted, 2);
        $endRestricted = round($begRestricted + $priorRestricted + $currRestricted - $releasedRestricted, 2);
        $endTotal = round($endUnrestricted + $endRestricted, 2);

        return [
            'filter' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'unrestricted' => [
                'beginning' => round($begUnrestricted, 2),
                'prior_period' => round($priorUnrestricted, 2),
                'current_period' => round($currUnrestricted, 2),
                'released' => round($releasedUnrestricted, 2),
                'ending' => $endUnrestricted,
            ],
            'restricted' => [
                'beginning' => round($begRestricted, 2),
                'prior_period' => round($priorRestricted, 2),
                'current_period' => round($currRestricted, 2),
                'released' => round($releasedRestricted, 2),
                'ending' => $endRestricted,
            ],
            'total' => [
                'beginning' => round($begUnrestricted + $begRestricted, 2),
                'prior_period' => round($priorUnrestricted + $priorRestricted, 2),
                'current_period' => round($currUnrestricted + $currRestricted, 2),
                'released' => round($releasedUnrestricted - $releasedRestricted, 2),
                'ending' => $endTotal,
            ],
            // Backward compatibility
            'beginning_net_assets' => [
                'unrestricted' => round($begUnrestricted + $priorUnrestricted, 2),
                'restricted' => round($begRestricted + $priorRestricted, 2),
                'total' => round($begUnrestricted + $priorUnrestricted + $begRestricted + $priorRestricted, 2),
            ],
            'current_period_changes' => [
                'unrestricted_surplus' => round($currUnrestricted, 2),
                'restricted_surplus' => round($currRestricted, 2),
                'total_surplus' => round($currUnrestricted + $currRestricted, 2),
            ],
            'ending_net_assets' => [
                'unrestricted' => $endUnrestricted,
                'restricted' => $endRestricted,
                'total' => $endTotal,
            ],
        ];
    }

    /**
     * Generate Comparative Laporan Perubahan Aset Neto (Statement of Changes in Net Assets).
     *
     * @param int|null $month
     * @param int|null $year
     * @param string $periodType 'MONTH'|'YEAR'|'CUSTOM'
     * @param string|null $startDate
     * @param string|null $endDate
     * @param string $compareMode 'NONE'|'PRIOR_MONTH'|'PRIOR_YEAR'|'CUSTOM'
     * @param int|null $compareMonth
     * @param int|null $compareYear
     * @return array
     */
    public static function getComparativeChangesInNetAssets(
        ?int $month = null,
        ?int $year = null,
        string $periodType = 'MONTH',
        ?string $startDate = null,
        ?string $endDate = null,
        string $compareMode = 'NONE',
        ?int $compareMonth = null,
        ?int $compareYear = null
    ): array {
        if ($startDate && $endDate && !$month && !$year) {
            $currStart = $startDate;
            $currEnd = $endDate;
            $label = "$currStart s/d $currEnd";
            $month = (int) date('m', strtotime($endDate));
            $year = (int) date('Y', strtotime($endDate));
        } elseif ($periodType === 'YEAR') {
            $year = $year ?: (int) date('Y');
            $currStart = sprintf('%04d-01-01', $year);
            $currEnd = sprintf('%04d-12-31', $year);
            $label = "Tahun $year";
            $month = 12;
        } else {
            $year = $year ?: (int) date('Y');
            $month = $month ?: (int) date('m');
            $lastDay = date('t', strtotime(sprintf('%04d-%02d-01', $year, $month)));
            $currStart = sprintf('%04d-%02d-01', $year, $month);
            $currEnd = sprintf('%04d-%02d-%02d', $year, $month, $lastDay);
            $label = self::getMonthName($month) . " $year";
        }

        $currentCna = self::getChangesInNetAssets($currStart, $currEnd);

        if ($compareMode === 'NONE' || !$compareMode) {
            return array_merge($currentCna, [
                'is_comparative' => false,
                'filter' => [
                    'month' => $month,
                    'year' => $year,
                    'period_type' => $periodType,
                    'start_date' => $currStart,
                    'end_date' => $currEnd,
                    'compare_mode' => 'NONE',
                ],
                'current_period' => [
                    'month' => $month,
                    'year' => $year,
                    'label' => $label,
                    'start_date' => $currStart,
                    'end_date' => $currEnd,
                ],
            ]);
        }

        // Determine comparison period dates
        $compMonth = $compareMonth;
        $compYear = $compareYear;

        if ($compareMode === 'PRIOR_MONTH') {
            if ($month === 1) {
                $compMonth = 12;
                $compYear = $year - 1;
            } else {
                $compMonth = $month - 1;
                $compYear = $year;
            }
            $compLastDay = date('t', strtotime(sprintf('%04d-%02d-01', $compYear, $compMonth)));
            $compStart = sprintf('%04d-%02d-01', $compYear, $compMonth);
            $compEnd = sprintf('%04d-%02d-%02d', $compYear, $compMonth, $compLastDay);
            $compLabel = self::getMonthName($compMonth) . " $compYear";
        } elseif ($compareMode === 'PRIOR_YEAR') {
            $compYear = $year - 1;
            if ($periodType === 'YEAR') {
                $compStart = sprintf('%04d-01-01', $compYear);
                $compEnd = sprintf('%04d-12-31', $compYear);
                $compLabel = "Tahun $compYear";
            } else {
                $compMonth = $month;
                $compLastDay = date('t', strtotime(sprintf('%04d-%02d-01', $compYear, $compMonth)));
                $compStart = sprintf('%04d-%02d-01', $compYear, $compMonth);
                $compEnd = sprintf('%04d-%02d-%02d', $compYear, $compMonth, $compLastDay);
                $compLabel = self::getMonthName($compMonth) . " $compYear";
            }
        } else {
            // CUSTOM
            $compMonth = $compMonth ?: $month;
            $compYear = $compYear ?: $year;
            if ($periodType === 'YEAR') {
                $compStart = sprintf('%04d-01-01', $compYear);
                $compEnd = sprintf('%04d-12-31', $compYear);
                $compLabel = "Tahun $compYear";
            } else {
                $compLastDay = date('t', strtotime(sprintf('%04d-%02d-01', $compYear, $compMonth)));
                $compStart = sprintf('%04d-%02d-01', $compYear, $compMonth);
                $compEnd = sprintf('%04d-%02d-%02d', $compYear, $compMonth, $compLastDay);
                $compLabel = self::getMonthName($compMonth) . " $compYear";
            }
        }

        $compCna = self::getChangesInNetAssets($compStart, $compEnd);

        return array_merge($currentCna, [
            'is_comparative' => true,
            'filter' => [
                'month' => $month,
                'year' => $year,
                'period_type' => $periodType,
                'start_date' => $currStart,
                'end_date' => $currEnd,
                'compare_mode' => $compareMode,
                'compare_month' => $compMonth,
                'compare_year' => $compYear,
            ],
            'current_period' => [
                'month' => $month,
                'year' => $year,
                'label' => $label,
                'start_date' => $currStart,
                'end_date' => $currEnd,
                'data' => $currentCna,
            ],
            'comparison_period' => [
                'month' => $compMonth,
                'year' => $compYear,
                'label' => $compLabel,
                'start_date' => $compStart,
                'end_date' => $compEnd,
                'data' => $compCna,
            ],
            'comparative_data' => [
                'unrestricted' => [
                    'beginning' => self::calcTotalVariance($currentCna['unrestricted']['beginning'], $compCna['unrestricted']['beginning']),
                    'prior_period' => self::calcTotalVariance($currentCna['unrestricted']['prior_period'], $compCna['unrestricted']['prior_period']),
                    'current_period' => self::calcTotalVariance($currentCna['unrestricted']['current_period'], $compCna['unrestricted']['current_period']),
                    'released' => self::calcTotalVariance($currentCna['unrestricted']['released'], $compCna['unrestricted']['released']),
                    'ending' => self::calcTotalVariance($currentCna['unrestricted']['ending'], $compCna['unrestricted']['ending']),
                ],
                'restricted' => [
                    'beginning' => self::calcTotalVariance($currentCna['restricted']['beginning'], $compCna['restricted']['beginning']),
                    'prior_period' => self::calcTotalVariance($currentCna['restricted']['prior_period'], $compCna['restricted']['prior_period']),
                    'current_period' => self::calcTotalVariance($currentCna['restricted']['current_period'], $compCna['restricted']['current_period']),
                    'released' => self::calcTotalVariance($currentCna['restricted']['released'], $compCna['restricted']['released']),
                    'ending' => self::calcTotalVariance($currentCna['restricted']['ending'], $compCna['restricted']['ending']),
                ],
                'total' => [
                    'beginning' => self::calcTotalVariance($currentCna['total']['beginning'], $compCna['total']['beginning']),
                    'prior_period' => self::calcTotalVariance($currentCna['total']['prior_period'], $compCna['total']['prior_period']),
                    'current_period' => self::calcTotalVariance($currentCna['total']['current_period'], $compCna['total']['current_period']),
                    'released' => self::calcTotalVariance($currentCna['total']['released'], $compCna['total']['released']),
                    'ending' => self::calcTotalVariance($currentCna['total']['ending'], $compCna['total']['ending']),
                ],
                'beginning_net_assets' => [
                    'unrestricted' => self::calcTotalVariance($currentCna['beginning_net_assets']['unrestricted'], $compCna['beginning_net_assets']['unrestricted']),
                    'restricted' => self::calcTotalVariance($currentCna['beginning_net_assets']['restricted'], $compCna['beginning_net_assets']['restricted']),
                    'total' => self::calcTotalVariance($currentCna['beginning_net_assets']['total'], $compCna['beginning_net_assets']['total']),
                ],
                'current_period_changes' => [
                    'unrestricted_surplus' => self::calcTotalVariance($currentCna['current_period_changes']['unrestricted_surplus'], $compCna['current_period_changes']['unrestricted_surplus']),
                    'restricted_surplus' => self::calcTotalVariance($currentCna['current_period_changes']['restricted_surplus'], $compCna['current_period_changes']['restricted_surplus']),
                    'total_surplus' => self::calcTotalVariance($currentCna['current_period_changes']['total_surplus'], $compCna['current_period_changes']['total_surplus']),
                ],
                'ending_net_assets' => [
                    'unrestricted' => self::calcTotalVariance($currentCna['ending_net_assets']['unrestricted'], $compCna['ending_net_assets']['unrestricted']),
                    'restricted' => self::calcTotalVariance($currentCna['ending_net_assets']['restricted'], $compCna['ending_net_assets']['restricted']),
                    'total' => self::calcTotalVariance($currentCna['ending_net_assets']['total'], $compCna['ending_net_assets']['total']),
                ],
            ],
        ]);
    }

    /**
     * Generate Laporan Arus Kas (Statement of Cash Flows).
     *
     * @param string|null $startDate
     * @param string|null $endDate
     * @return array
     */
    public static function getCashFlows(?string $startDate = null, ?string $endDate = null): array
    {
        $startDate = $startDate ?: date('Y-01-01');
        $endDate = $endDate ?: date('Y-m-d');

        // Identify Kas & Bank accounts (code starts with 1101, 1102, 1103 or linked to cash_bank_accounts)
        $cashAccounts = Account::where('type', 'ASSET')
            ->where('is_postable', true)
            ->where(function ($q) {
                $q->where('code', 'like', '110%')
                  ->orWhereHas('cashBankAccount');
            })->pluck('id')->toArray();

        // 1. Beginning Cash Balance
        $priorEntries = JournalEntry::whereIn('account_id', $cashAccounts)
            ->whereHas('journal', function ($j) use ($startDate) {
                $j->where('status', 'POSTED')->whereDate('journal_date', '<', $startDate);
            })->get();

        $beginningCash = (float) $priorEntries->sum('debit') - (float) $priorEntries->sum('credit');

        // 2. Period Cash Movements
        $cashEntries = JournalEntry::whereIn('account_id', $cashAccounts)
            ->whereHas('journal', function ($j) use ($startDate, $endDate) {
                $j->where('status', 'POSTED')
                  ->whereDate('journal_date', '>=', $startDate)
                  ->whereDate('journal_date', '<=', $endDate);
            })->with(['journal.entries.account'])->get();

        $operatingIn = 0.00;
        $operatingOut = 0.00;
        $investingIn = 0.00;
        $investingOut = 0.00;
        $financingIn = 0.00;
        $financingOut = 0.00;

        foreach ($cashEntries as $cEntry) {
            $debitVal = (float) $cEntry->debit;
            $creditVal = (float) $cEntry->credit;
            $isReceipt = $debitVal > 0;
            $amount = $isReceipt ? $debitVal : $creditVal;

            // Find contra entries in the same journal (excluding current entry)
            $contraEntries = $cEntry->journal->entries->reject(function ($e) use ($cEntry) {
                return (int) $e->id === (int) $cEntry->id;
            });

            $activity = 'OPERATING';
            if ($contraEntries->count() > 0) {
                $firstContra = $contraEntries->first();
                if ($firstContra && $firstContra->account) {
                    $activity = ReportMappingService::getCashFlowActivity($firstContra->account);
                }
            }

            if ($activity === 'INVESTING') {
                if ($isReceipt) {
                    $investingIn += $amount;
                } else {
                    $investingOut += $amount;
                }
            } elseif ($activity === 'FINANCING') {
                if ($isReceipt) {
                    $financingIn += $amount;
                } else {
                    $financingOut += $amount;
                }
            } else {
                if ($isReceipt) {
                    $operatingIn += $amount;
                } else {
                    $operatingOut += $amount;
                }
            }
        }

        $netOperating = $operatingIn - $operatingOut;
        $netInvesting = $investingIn - $investingOut;
        $netFinancing = $financingIn - $financingOut;

        $netCashChange = $netOperating + $netInvesting + $netFinancing;
        $endingCash = $beginningCash + $netCashChange;

        // Reconcile with Balance sheet ending cash
        $bs = self::getBalanceSheet($endDate);
        $bsCashTotal = 0.00;
        foreach ($bs['assets']['current_assets'] as $ca) {
            if (in_array($ca['account_id'], $cashAccounts)) {
                $bsCashTotal += $ca['balance'];
            }
        }

        return [
            'filter' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'beginning_cash' => round($beginningCash, 2),
            'operating_activities' => [
                'cash_receipts' => round($operatingIn, 2),
                'cash_disbursements' => round($operatingOut, 2),
                'net_cash' => round($netOperating, 2),
            ],
            'investing_activities' => [
                'cash_receipts' => round($investingIn, 2),
                'cash_disbursements' => round($investingOut, 2),
                'net_cash' => round($netInvesting, 2),
            ],
            'financing_activities' => [
                'cash_receipts' => round($financingIn, 2),
                'cash_disbursements' => round($financingOut, 2),
                'net_cash' => round($netFinancing, 2),
            ],
            'net_cash_increase_decrease' => round($netCashChange, 2),
            'ending_cash' => round($endingCash, 2),
            'balance_sheet_cash' => round($bsCashTotal, 2),
            'is_reconciled' => abs($endingCash - $bsCashTotal) < 0.01,
        ];
    }

    /**
     * Generate Comparative Laporan Arus Kas (Statement of Cash Flows).
     *
     * @param int|null $month
     * @param int|null $year
     * @param string $periodType 'MONTH'|'YEAR'|'CUSTOM'
     * @param string|null $startDate
     * @param string|null $endDate
     * @param string $compareMode 'NONE'|'PRIOR_MONTH'|'PRIOR_YEAR'|'CUSTOM'
     * @param int|null $compareMonth
     * @param int|null $compareYear
     * @return array
     */
    public static function getComparativeCashFlows(
        ?int $month = null,
        ?int $year = null,
        string $periodType = 'MONTH',
        ?string $startDate = null,
        ?string $endDate = null,
        string $compareMode = 'NONE',
        ?int $compareMonth = null,
        ?int $compareYear = null
    ): array {
        if ($startDate && $endDate && !$month && !$year) {
            $currStart = $startDate;
            $currEnd = $endDate;
            $label = "$currStart s/d $currEnd";
            $month = (int) date('m', strtotime($endDate));
            $year = (int) date('Y', strtotime($endDate));
        } elseif ($periodType === 'YEAR') {
            $year = $year ?: (int) date('Y');
            $currStart = sprintf('%04d-01-01', $year);
            $currEnd = sprintf('%04d-12-31', $year);
            $label = "Tahun $year";
            $month = 12;
        } else {
            $year = $year ?: (int) date('Y');
            $month = $month ?: (int) date('m');
            $lastDay = date('t', strtotime(sprintf('%04d-%02d-01', $year, $month)));
            $currStart = sprintf('%04d-%02d-01', $year, $month);
            $currEnd = sprintf('%04d-%02d-%02d', $year, $month, $lastDay);
            $label = self::getMonthName($month) . " $year";
        }

        $currentCf = self::getCashFlows($currStart, $currEnd);

        if ($compareMode === 'NONE' || !$compareMode) {
            return array_merge($currentCf, [
                'is_comparative' => false,
                'filter' => [
                    'month' => $month,
                    'year' => $year,
                    'period_type' => $periodType,
                    'start_date' => $currStart,
                    'end_date' => $currEnd,
                    'compare_mode' => 'NONE',
                ],
                'current_period' => [
                    'month' => $month,
                    'year' => $year,
                    'label' => $label,
                    'start_date' => $currStart,
                    'end_date' => $currEnd,
                ],
            ]);
        }

        // Determine comparison period dates
        $compMonth = $compareMonth;
        $compYear = $compareYear;

        if ($compareMode === 'PRIOR_MONTH') {
            if ($month === 1) {
                $compMonth = 12;
                $compYear = $year - 1;
            } else {
                $compMonth = $month - 1;
                $compYear = $year;
            }
            $compLastDay = date('t', strtotime(sprintf('%04d-%02d-01', $compYear, $compMonth)));
            $compStart = sprintf('%04d-%02d-01', $compYear, $compMonth);
            $compEnd = sprintf('%04d-%02d-%02d', $compYear, $compMonth, $compLastDay);
            $compLabel = self::getMonthName($compMonth) . " $compYear";
        } elseif ($compareMode === 'PRIOR_YEAR') {
            $compYear = $year - 1;
            if ($periodType === 'YEAR') {
                $compStart = sprintf('%04d-01-01', $compYear);
                $compEnd = sprintf('%04d-12-31', $compYear);
                $compLabel = "Tahun $compYear";
            } else {
                $compMonth = $month;
                $compLastDay = date('t', strtotime(sprintf('%04d-%02d-01', $compYear, $compMonth)));
                $compStart = sprintf('%04d-%02d-01', $compYear, $compMonth);
                $compEnd = sprintf('%04d-%02d-%02d', $compYear, $compMonth, $compLastDay);
                $compLabel = self::getMonthName($compMonth) . " $compYear";
            }
        } else {
            // CUSTOM
            $compMonth = $compMonth ?: $month;
            $compYear = $compYear ?: $year;
            if ($periodType === 'YEAR') {
                $compStart = sprintf('%04d-01-01', $compYear);
                $compEnd = sprintf('%04d-12-31', $compYear);
                $compLabel = "Tahun $compYear";
            } else {
                $compLastDay = date('t', strtotime(sprintf('%04d-%02d-01', $compYear, $compMonth)));
                $compStart = sprintf('%04d-%02d-01', $compYear, $compMonth);
                $compEnd = sprintf('%04d-%02d-%02d', $compYear, $compMonth, $compLastDay);
                $compLabel = self::getMonthName($compMonth) . " $compYear";
            }
        }

        $compCf = self::getCashFlows($compStart, $compEnd);

        return array_merge($currentCf, [
            'is_comparative' => true,
            'filter' => [
                'month' => $month,
                'year' => $year,
                'period_type' => $periodType,
                'start_date' => $currStart,
                'end_date' => $currEnd,
                'compare_mode' => $compareMode,
                'compare_month' => $compMonth,
                'compare_year' => $compYear,
            ],
            'current_period' => [
                'month' => $month,
                'year' => $year,
                'label' => $label,
                'start_date' => $currStart,
                'end_date' => $currEnd,
                'data' => $currentCf,
            ],
            'comparison_period' => [
                'month' => $compMonth,
                'year' => $compYear,
                'label' => $compLabel,
                'start_date' => $compStart,
                'end_date' => $compEnd,
                'data' => $compCf,
            ],
            'comparative_data' => [
                'beginning_cash' => self::calcTotalVariance($currentCf['beginning_cash'], $compCf['beginning_cash']),
                'operating_activities' => [
                    'cash_receipts' => self::calcTotalVariance($currentCf['operating_activities']['cash_receipts'], $compCf['operating_activities']['cash_receipts']),
                    'cash_disbursements' => self::calcTotalVariance($currentCf['operating_activities']['cash_disbursements'], $compCf['operating_activities']['cash_disbursements']),
                    'net_cash' => self::calcTotalVariance($currentCf['operating_activities']['net_cash'], $compCf['operating_activities']['net_cash']),
                ],
                'investing_activities' => [
                    'cash_receipts' => self::calcTotalVariance($currentCf['investing_activities']['cash_receipts'], $compCf['investing_activities']['cash_receipts']),
                    'cash_disbursements' => self::calcTotalVariance($currentCf['investing_activities']['cash_disbursements'], $compCf['investing_activities']['cash_disbursements']),
                    'net_cash' => self::calcTotalVariance($currentCf['investing_activities']['net_cash'], $compCf['investing_activities']['net_cash']),
                ],
                'financing_activities' => [
                    'cash_receipts' => self::calcTotalVariance($currentCf['financing_activities']['cash_receipts'], $compCf['financing_activities']['cash_receipts']),
                    'cash_disbursements' => self::calcTotalVariance($currentCf['financing_activities']['cash_disbursements'], $compCf['financing_activities']['cash_disbursements']),
                    'net_cash' => self::calcTotalVariance($currentCf['financing_activities']['net_cash'], $compCf['financing_activities']['net_cash']),
                ],
                'net_cash_increase_decrease' => self::calcTotalVariance($currentCf['net_cash_increase_decrease'], $compCf['net_cash_increase_decrease']),
                'ending_cash' => self::calcTotalVariance($currentCf['ending_cash'], $compCf['ending_cash']),
            ],
        ]);
    }
}

<?php

namespace App\Services;

use App\Models\Account;

class ReportMappingService
{
    /**
     * Categorize Account into Financial Position (Balance Sheet) Category.
     *
     * @param Account $account
     * @return string
     */
    public static function getBalanceSheetCategory(Account $account): string
    {
        $code = (string) $account->code;

        if ($account->type === 'ASSET') {
            // 11xx -> Current Assets (Aset Lancar)
            if (str_starts_with($code, '11')) {
                return 'CURRENT_ASSET';
            }
            // 12xx or other -> Non-Current Assets (Aset Tetap / Tidak Lancar)
            return 'NON_CURRENT_ASSET';
        }

        if ($account->type === 'LIABILITY') {
            // 21xx -> Short-Term Liabilities (Liabilitas Jangka Pendek)
            if (str_starts_with($code, '21')) {
                return 'SHORT_TERM_LIABILITY';
            }
            // 22xx -> Long-Term Liabilities (Liabilitas Jangka Panjang)
            return 'LONG_TERM_LIABILITY';
        }

        if ($account->type === 'EQUITY') {
            if ($code === '3201' || str_contains(strtolower($account->name), 'dengan') || (str_contains(strtolower($account->name), 'pembatasan') && !str_contains(strtolower($account->name), 'tanpa'))) {
                return 'RESTRICTED_NET_ASSETS';
            }
            return 'UNRESTRICTED_NET_ASSETS';
        }

        return 'OTHER';
    }

    /**
     * Categorize Account or Entry into Income Statement (Statement of Activities) Category.
     *
     * @param Account $account
     * @param string|null $restrictionType
     * @return string
     */
    public static function getIncomeStatementCategory(Account $account, ?string $restrictionType = null): string
    {
        if ($account->type === 'INCOME') {
            if ($restrictionType === 'WITH_RESTRICTION') {
                return 'REVENUE_RESTRICTED';
            }
            return 'REVENUE_UNRESTRICTED';
        }

        if ($account->type === 'EXPENSE') {
            $code = (string) $account->code;
            if (str_starts_with($code, '51')) {
                return 'EXPENSE_PROGRAM';
            }
            if (str_starts_with($code, '52')) {
                return 'EXPENSE_MANAGEMENT_GENERAL';
            }
            if (str_starts_with($code, '53')) {
                return 'EXPENSE_FUNDRAISING';
            }
            return 'EXPENSE_PROGRAM';
        }

        return 'OTHER';
    }

    /**
     * Categorize Cash Flow Activity.
     *
     * @param Account $contraAccount
     * @return string OPERATING | INVESTING | FINANCING
     */
    public static function getCashFlowActivity(Account $contraAccount): string
    {
        $code = (string) $contraAccount->code;

        // Investing: Purchase/Sale of Fixed Assets (12xx)
        if ($contraAccount->type === 'ASSET' && str_starts_with($code, '12')) {
            return 'INVESTING';
        }

        // Financing: Long-Term Liabilities (22xx) or Direct Net Asset Equity Contributions (3000s)
        if ($contraAccount->type === 'LIABILITY' && str_starts_with($code, '22')) {
            return 'FINANCING';
        }

        // Operating: Income, Expenses, Current Assets (11xx), Short-Term Liabilities (21xx)
        return 'OPERATING';
    }
}

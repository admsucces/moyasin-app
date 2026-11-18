<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\FinancialReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialReportController extends Controller
{
    /**
     * GET /api/v1/reports/balance-sheet
     */
    public function balanceSheet(Request $request): JsonResponse
    {
        $asOfDate = $request->query('as_of_date');
        $month = $request->query('month') ? (int) $request->query('month') : null;
        $year = $request->query('year') ? (int) $request->query('year') : null;
        $compareMode = $request->query('compare_mode', 'NONE');
        $compareMonth = $request->query('compare_month') ? (int) $request->query('compare_month') : null;
        $compareYear = $request->query('compare_year') ? (int) $request->query('compare_year') : null;

        $report = FinancialReportService::getComparativeBalanceSheet(
            $month, $year, $asOfDate, $compareMode, $compareMonth, $compareYear
        );

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * GET /api/v1/reports/income-statement
     */
    public function incomeStatement(Request $request): JsonResponse
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $month = $request->query('month') ? (int) $request->query('month') : null;
        $year = $request->query('year') ? (int) $request->query('year') : null;
        $periodType = $request->query('period_type', 'MONTH');
        $compareMode = $request->query('compare_mode', 'NONE');
        $compareMonth = $request->query('compare_month') ? (int) $request->query('compare_month') : null;
        $compareYear = $request->query('compare_year') ? (int) $request->query('compare_year') : null;

        $report = FinancialReportService::getComparativeIncomeStatement(
            $month, $year, $periodType, $startDate, $endDate, $compareMode, $compareMonth, $compareYear
        );

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * GET /api/v1/reports/changes-in-net-assets
     */
    public function changesInNetAssets(Request $request): JsonResponse
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $month = $request->query('month') ? (int) $request->query('month') : null;
        $year = $request->query('year') ? (int) $request->query('year') : null;
        $periodType = $request->query('period_type', 'MONTH');
        $compareMode = $request->query('compare_mode', 'NONE');
        $compareMonth = $request->query('compare_month') ? (int) $request->query('compare_month') : null;
        $compareYear = $request->query('compare_year') ? (int) $request->query('compare_year') : null;

        $report = FinancialReportService::getComparativeChangesInNetAssets(
            $month, $year, $periodType, $startDate, $endDate, $compareMode, $compareMonth, $compareYear
        );

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * GET /api/v1/reports/cash-flows
     */
    public function cashFlows(Request $request): JsonResponse
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $month = $request->query('month') ? (int) $request->query('month') : null;
        $year = $request->query('year') ? (int) $request->query('year') : null;
        $periodType = $request->query('period_type', 'MONTH');
        $compareMode = $request->query('compare_mode', 'NONE');
        $compareMonth = $request->query('compare_month') ? (int) $request->query('compare_month') : null;
        $compareYear = $request->query('compare_year') ? (int) $request->query('compare_year') : null;

        $report = FinancialReportService::getComparativeCashFlows(
            $month, $year, $periodType, $startDate, $endDate, $compareMode, $compareMonth, $compareYear
        );

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }
}

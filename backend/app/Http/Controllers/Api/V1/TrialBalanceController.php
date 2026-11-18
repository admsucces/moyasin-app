<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\TrialBalanceService;
use Illuminate\Http\Request;

class TrialBalanceController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'accounting_period_id' => 'nullable|exists:accounting_periods,id',
        ]);

        $dateFrom = $request->date_from;
        $dateTo = $request->date_to;
        $periodId = $request->accounting_period_id ? (int) $request->accounting_period_id : null;

        $trialBalanceData = TrialBalanceService::getTrialBalance($dateFrom, $dateTo, $periodId);

        return response()->json([
            'success' => true,
            'message' => 'Neraca Saldo (Trial Balance) berhasil diambil.',
            'data' => $trialBalanceData,
        ]);
    }

    public function postClosing(Request $request)
    {
        $request->validate([
            'year' => 'nullable|integer',
            'as_of_date' => 'nullable|date',
            'accounting_period_id' => 'nullable|exists:accounting_periods,id',
        ]);

        $year = $request->year ? (int) $request->year : null;
        $asOfDate = $request->as_of_date;
        $periodId = $request->accounting_period_id ? (int) $request->accounting_period_id : null;

        $postClosingData = TrialBalanceService::getPostClosingTrialBalance($periodId, $asOfDate, $year);

        return response()->json([
            'success' => true,
            'message' => 'Neraca Penutup (Post-Closing Trial Balance) berhasil diambil.',
            'data' => $postClosingData,
        ]);
    }
}

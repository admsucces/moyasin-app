<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\LedgerService;
use Illuminate\Http\Request;

class LedgerController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'program_id' => 'nullable|exists:programs,id',
            'donor_id' => 'nullable|exists:donors,id',
        ]);

        $accountId = (int) $request->account_id;
        $dateFrom = $request->date_from;
        $dateTo = $request->date_to;
        $programId = $request->program_id ? (int) $request->program_id : null;
        $donorId = $request->donor_id ? (int) $request->donor_id : null;

        $ledgerData = LedgerService::getAccountLedger($accountId, $dateFrom, $dateTo, $programId, $donorId);

        return response()->json([
            'success' => true,
            'message' => 'Laporan Buku Besar berhasil diambil.',
            'data' => $ledgerData,
        ]);
    }

    public function subLedger(Request $request)
    {
        $request->validate([
            'account_id' => 'nullable|exists:accounts,id',
            'donor_id' => 'nullable|exists:donors,id',
            'program_id' => 'nullable|exists:programs,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $accountId = $request->account_id ? (int) $request->account_id : null;
        $donorId = $request->donor_id ? (int) $request->donor_id : null;
        $programId = $request->program_id ? (int) $request->program_id : null;
        $dateFrom = $request->date_from;
        $dateTo = $request->date_to;

        $subLedgerData = LedgerService::getSubsidiaryLedger($accountId, $donorId, $programId, $dateFrom, $dateTo);

        return response()->json([
            'success' => true,
            'message' => 'Laporan Buku Besar Pembantu berhasil diambil.',
            'data' => $subLedgerData,
        ]);
    }
}

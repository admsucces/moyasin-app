<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateAccountingPeriodRequest;
use App\Http\Resources\AccountingPeriodResource;
use App\Models\AccountingPeriod;
use App\Services\AuditLogService;
use App\Services\PeriodControlService;
use Illuminate\Http\Request;

class AccountingPeriodController extends Controller
{
    public function index()
    {
        $periods = AccountingPeriod::with(['closedUser', 'reopenedUser'])
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar periode akuntansi berhasil diambil.',
            'data' => AccountingPeriodResource::collection($periods),
        ]);
    }

    public function store(CreateAccountingPeriodRequest $request)
    {
        $period = AccountingPeriod::create([
            'name' => $request->name,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'status' => 'OPEN',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Periode akuntansi baru berhasil dibuat.',
            'data' => new AccountingPeriodResource($period),
        ], 201);
    }

    public function closePeriod(Request $request, $id)
    {
        $period = AccountingPeriod::findOrFail($id);

        $closedPeriod = PeriodControlService::closePeriod($period, $request->user());

        AuditLogService::log(
            $request->user(),
            'PERIOD_CLOSED',
            'AccountingPeriod',
            $closedPeriod->id,
            "Menutup periode akuntansi '{$closedPeriod->name}'"
        );

        return response()->json([
            'success' => true,
            'message' => "Periode akuntansi '{$closedPeriod->name}' berhasil ditutup (CLOSED).",
            'data' => new AccountingPeriodResource($closedPeriod),
        ]);
    }

    public function requestReopen(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|min:5|max:500',
        ]);

        $period = AccountingPeriod::findOrFail($id);

        $updatedPeriod = PeriodControlService::requestReopenPeriod($period, $request->user(), $request->reason);

        AuditLogService::log(
            $request->user(),
            'REOPEN_REQUESTED',
            'AccountingPeriod',
            $updatedPeriod->id,
            "Mengajukan pembukaan kembali periode akuntansi '{$updatedPeriod->name}'. Alasan: {$request->reason}"
        );

        return response()->json([
            'success' => true,
            'message' => "Pengajuan pembukaan kembali periode '{$updatedPeriod->name}' berhasil dikirim.",
            'data' => new AccountingPeriodResource($updatedPeriod),
        ]);
    }

    public function approveReopen(Request $request, $id)
    {
        $period = AccountingPeriod::findOrFail($id);

        $reopenedPeriod = PeriodControlService::approveReopenPeriod($period, $request->user(), $request->reason);

        AuditLogService::log(
            $request->user(),
            'PERIOD_REOPENED',
            'AccountingPeriod',
            $reopenedPeriod->id,
            "Menyetujui pembukaan kembali periode akuntansi '{$reopenedPeriod->name}'"
        );

        return response()->json([
            'success' => true,
            'message' => "Periode akuntansi '{$reopenedPeriod->name}' berhasil dibuka kembali (OPEN).",
            'data' => new AccountingPeriodResource($reopenedPeriod),
        ]);
    }
}

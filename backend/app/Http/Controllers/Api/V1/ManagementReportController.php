<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ManagementReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagementReportController extends Controller
{
    /**
     * GET /api/v1/reports/management
     */
    public function summary(Request $request): JsonResponse
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');

        $report = ManagementReportService::getManagementSummary($startDate, $endDate);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }
}

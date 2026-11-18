<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * GET /api/v1/dashboard
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $periodFilter = $request->query('filter', 'Bulan Ini');

        $data = DashboardService::getDashboardData($user, $periodFilter);

        return response()->json([
            'success' => true,
            'message' => 'Data dashboard berhasil diambil.',
            'data' => $data,
        ]);
    }
}


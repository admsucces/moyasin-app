<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AccountingPeriod;
use App\Models\AuditLog;
use App\Models\FixedAsset;
use App\Models\FixedAssetDepreciation;
use App\Models\Journal;
use App\Models\JournalEntry;
use App\Services\JournalNumberService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FixedAssetController extends Controller
{
    /**
     * Display a listing of fixed assets.
     */
    public function index(Request $request)
    {
        $query = FixedAsset::with([
            'assetAccount',
            'accumulatedDeprAccount',
            'depreciationExpenseAccount',
        ]);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('asset_code', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $assets = $query->orderBy('asset_code', 'asc')->get();

        $totalCost = $assets->sum('acquisition_cost');
        $totalAccumulatedDepr = $assets->sum('total_accumulated_depreciation');
        $totalBookValue = $assets->sum('book_value');

        return response()->json([
            'success' => true,
            'message' => 'Daftar aset tetap berhasil diambil.',
            'data' => [
                'assets' => $assets,
                'summary' => [
                    'total_count' => $assets->count(),
                    'total_acquisition_cost' => $totalCost,
                    'total_accumulated_depreciation' => $totalAccumulatedDepr,
                    'total_book_value' => $totalBookValue,
                ],
            ],
        ]);
    }

    /**
     * Display the specified fixed asset.
     */
    public function show($id)
    {
        $asset = FixedAsset::with([
            'assetAccount',
            'accumulatedDeprAccount',
            'depreciationExpenseAccount',
            'depreciations.journal',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail aset tetap berhasil diambil.',
            'data' => $asset,
        ]);
    }

    /**
     * Store a newly created fixed asset in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'asset_code' => 'required|string|max:50|unique:fixed_assets,asset_code',
            'name' => 'required|string|max:150',
            'acquisition_date' => 'required|date',
            'acquisition_cost' => 'required|numeric|min:0',
            'useful_life_years' => 'required|integer|min:0',
            'salvage_value' => 'nullable|numeric|min:0',
            'depreciation_method' => 'required|in:STRAIGHT_LINE,NONE',
            'asset_account_id' => 'required|exists:accounts,id',
            'accumulated_depr_account_id' => 'nullable|required_if:depreciation_method,STRAIGHT_LINE|exists:accounts,id',
            'depreciation_expense_account_id' => 'nullable|required_if:depreciation_method,STRAIGHT_LINE|exists:accounts,id',
            'description' => 'nullable|string',
        ]);

        $asset = FixedAsset::create([
            'asset_code' => $request->asset_code,
            'name' => $request->name,
            'acquisition_date' => $request->acquisition_date,
            'acquisition_cost' => $request->acquisition_cost,
            'useful_life_years' => $request->useful_life_years,
            'salvage_value' => $request->salvage_value ?? 0,
            'depreciation_method' => $request->depreciation_method,
            'asset_account_id' => $request->asset_account_id,
            'accumulated_depr_account_id' => $request->accumulated_depr_account_id,
            'depreciation_expense_account_id' => $request->depreciation_expense_account_id,
            'status' => 'ACTIVE',
            'description' => $request->description,
        ]);

        $asset->load([
            'assetAccount',
            'accumulatedDeprAccount',
            'depreciationExpenseAccount',
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'FIXED_ASSET_CREATED',
            'entity_type' => 'FixedAsset',
            'entity_id' => $asset->id,
            'description' => "Aset Tetap baru [{$asset->asset_code}] {$asset->name} telah dicatat.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Aset tetap baru berhasil ditambahkan.',
            'data' => $asset,
        ], 201);
    }

    /**
     * Update the specified fixed asset.
     */
    public function update(Request $request, $id)
    {
        $asset = FixedAsset::findOrFail($id);

        $request->validate([
            'asset_code' => 'required|string|max:50|unique:fixed_assets,asset_code,' . $asset->id,
            'name' => 'required|string|max:150',
            'acquisition_date' => 'required|date',
            'acquisition_cost' => 'required|numeric|min:0',
            'useful_life_years' => 'required|integer|min:0',
            'salvage_value' => 'nullable|numeric|min:0',
            'depreciation_method' => 'required|in:STRAIGHT_LINE,NONE',
            'asset_account_id' => 'required|exists:accounts,id',
            'accumulated_depr_account_id' => 'nullable|required_if:depreciation_method,STRAIGHT_LINE|exists:accounts,id',
            'depreciation_expense_account_id' => 'nullable|required_if:depreciation_method,STRAIGHT_LINE|exists:accounts,id',
            'status' => 'nullable|in:ACTIVE,DISPOSED',
            'description' => 'nullable|string',
        ]);

        $asset->update($request->only([
            'asset_code',
            'name',
            'acquisition_date',
            'acquisition_cost',
            'useful_life_years',
            'salvage_value',
            'depreciation_method',
            'asset_account_id',
            'accumulated_depr_account_id',
            'depreciation_expense_account_id',
            'status',
            'description',
        ]));

        $asset->load([
            'assetAccount',
            'accumulatedDeprAccount',
            'depreciationExpenseAccount',
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'FIXED_ASSET_UPDATED',
            'entity_type' => 'FixedAsset',
            'entity_id' => $asset->id,
            'description' => "Data aset tetap [{$asset->asset_code}] {$asset->name} diperbarui.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Data aset tetap berhasil diperbarui.',
            'data' => $asset,
        ]);
    }

    /**
     * Remove or dispose the specified fixed asset.
     */
    public function destroy(Request $request, $id)
    {
        $asset = FixedAsset::findOrFail($id);

        $assetCode = $asset->asset_code;
        $name = $asset->name;

        DB::transaction(function () use ($asset) {
            FixedAssetDepreciation::where('fixed_asset_id', $asset->id)->delete();
            $asset->delete();
        });

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'FIXED_ASSET_DELETED',
            'entity_type' => 'FixedAsset',
            'entity_id' => $id,
            'description' => "Aset tetap [{$assetCode}] {$name} telah dihapus.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Aset tetap berhasil dihapus.',
        ]);
    }

    /**
     * Execute monthly depreciation calculation and post journal.
     */
    public function processMonthlyDepreciation(Request $request)
    {
        $request->validate([
            'year' => 'required|integer|min:2000|max:2099',
            'month' => 'required|integer|min:1|max:12',
        ]);

        $year = (int) $request->year;
        $month = (int) $request->month;

        $depreciationDate = sprintf('%04d-%02d-28', $year, $month);

        $period = AccountingPeriod::where('start_date', '<=', $depreciationDate)
            ->where('end_date', '>=', $depreciationDate)
            ->first();

        if (!$period) {
            $period = AccountingPeriod::where('status', 'OPEN')->first();
        }

        if (!$period) {
            return response()->json([
                'success' => false,
                'message' => "Tidak ada periode akuntansi aktif yang mencakup tanggal {$depreciationDate}",
            ], 422);
        }

        $activeAssets = FixedAsset::where('status', 'ACTIVE')
            ->where('depreciation_method', 'STRAIGHT_LINE')
            ->where('acquisition_date', '<=', $depreciationDate)
            ->get();

        if ($activeAssets->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada aset tetap aktif yang perlu disusutkan untuk bulan ini.',
            ], 422);
        }

        $user = $request->user();
        $processedCount = 0;
        $totalDeprAmount = 0;

        DB::transaction(function () use ($activeAssets, $year, $month, $depreciationDate, $period, $user, &$processedCount, &$totalDeprAmount) {
            foreach ($activeAssets as $asset) {
                // Check if already depreciated for this month
                $alreadyDone = FixedAssetDepreciation::where('fixed_asset_id', $asset->id)
                    ->where('year', $year)
                    ->where('month', $month)
                    ->exists();

                if ($alreadyDone) {
                    continue;
                }

                $monthlyAmount = $asset->monthly_depreciation;
                $bookValue = $asset->book_value;

                if ($monthlyAmount <= 0 || $bookValue <= 0) {
                    continue;
                }

                $deprAmount = min($monthlyAmount, $bookValue);

                // Generate Journal
                $journalNo = JournalNumberService::generate($depreciationDate);
                $journal = Journal::create([
                    'journal_no' => $journalNo,
                    'transaction_id' => null,
                    'journal_date' => $depreciationDate,
                    'accounting_period_id' => $period->id,
                    'description' => "Penyusutan Aset Tetap [{$asset->asset_code}] {$asset->name} Periode " . sprintf('%02d/%04d', $month, $year),
                    'status' => 'POSTED',
                    'created_by' => $user->id,
                    'posted_by' => $user->id,
                    'posted_at' => now(),
                ]);

                // Debit: Beban Penyusutan
                JournalEntry::create([
                    'journal_id' => $journal->id,
                    'account_id' => $asset->depreciation_expense_account_id,
                    'debit' => $deprAmount,
                    'credit' => 0,
                    'description' => "Beban Penyusutan {$asset->name}",
                ]);

                // Credit: Akumulasi Penyusutan
                JournalEntry::create([
                    'journal_id' => $journal->id,
                    'account_id' => $asset->accumulated_depr_account_id,
                    'debit' => 0,
                    'credit' => $deprAmount,
                    'description' => "Akumulasi Penyusutan {$asset->name}",
                ]);

                // Log Depreciation
                FixedAssetDepreciation::create([
                    'fixed_asset_id' => $asset->id,
                    'journal_id' => $journal->id,
                    'year' => $year,
                    'month' => $month,
                    'amount' => $deprAmount,
                    'depreciation_date' => $depreciationDate,
                ]);

                $processedCount++;
                $totalDeprAmount += $deprAmount;
            }
        });

        if ($processedCount === 0) {
            return response()->json([
                'success' => true,
                'message' => 'Seluruh aset tetap sudah disusutkan untuk periode ini.',
                'data' => [
                    'processed_count' => 0,
                    'total_amount' => 0,
                ],
            ]);
        }

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'FIXED_ASSET_DEPRECIATED',
            'entity_type' => 'FixedAssetDepreciation',
            'entity_id' => 0,
            'description' => "Penyusutan bulanan {$processedCount} aset tetap periode {$month}/{$year} sebesar Rp " . number_format($totalDeprAmount, 0, ',', '.') . " telah diposting.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Proses penyusutan bulanan berhasil. Total {$processedCount} aset disusutkan sebesar Rp " . number_format($totalDeprAmount, 0, ',', '.'),
            'data' => [
                'processed_count' => $processedCount,
                'total_amount' => $totalDeprAmount,
            ],
        ]);
    }
}

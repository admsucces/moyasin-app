<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateDonorRequest;
use App\Http\Resources\DonorResource;
use App\Models\AuditLog;
use App\Models\Donor;
use App\Models\Payable;
use App\Models\Receivable;
use App\Models\Transaction;
use Illuminate\Http\Request;

class DonorController extends Controller
{
    public function index(Request $request)
    {
        $query = Donor::query();

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $donors = $query->orderBy('name', 'asc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar donatur/sumber dana berhasil diambil.',
            'data' => DonorResource::collection($donors),
        ]);
    }

    public function store(CreateDonorRequest $request)
    {
        $data = array_merge([
            'is_active' => true,
        ], $request->validated());

        $donor = Donor::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Data donatur baru berhasil dicatat.',
            'data' => new DonorResource($donor),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'type' => 'nullable|string|in:DONATUR,VENDOR,LAINNYA',
            'name' => 'required|string|max:200',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:190',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $donor = Donor::findOrFail($id);
        $donor->update($request->only(['type', 'name', 'phone', 'email', 'address', 'notes']));

        return response()->json([
            'success' => true,
            'message' => 'Data rekanan berhasil diperbarui.',
            'data' => new DonorResource($donor),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $donor = Donor::findOrFail($id);

        // 1. Check if used in transactions
        if (Transaction::where('donor_id', $donor->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Data rekanan tidak dapat dihapus karena sudah memiliki riwayat transaksi penerimaan/pengeluaran kas.',
            ], 422);
        }

        // 2. Check if used in payables (hutang)
        if (Payable::where('donor_id', $donor->id)->orWhere('vendor_name', $donor->name)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Data rekanan tidak dapat dihapus karena tercatat dalam modul Hutang yayasan.',
            ], 422);
        }

        // 3. Check if used in receivables (piutang)
        if (Receivable::where('donor_id', $donor->id)->orWhere('customer_name', $donor->name)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Data rekanan tidak dapat dihapus karena tercatat dalam modul Piutang yayasan.',
            ], 422);
        }

        $name = $donor->name;

        $donor->delete();

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'DONOR_DELETED',
            'entity_type' => 'Donor',
            'entity_id' => $id,
            'description' => "Data rekanan [{$name}] telah dihapus.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Data rekanan [{$name}] berhasil dihapus.",
        ]);
    }
}

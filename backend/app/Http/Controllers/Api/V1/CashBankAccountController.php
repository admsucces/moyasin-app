<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateCashBankAccountRequest;
use App\Http\Resources\CashBankAccountResource;
use App\Models\AuditLog;
use App\Models\CashBankAccount;
use App\Models\DebtPayment;
use App\Models\Transaction;
use Illuminate\Http\Request;

class CashBankAccountController extends Controller
{
    public function index(Request $request)
    {
        $query = CashBankAccount::with('account');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $cashBanks = $query->orderBy('name', 'asc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar kas & bank berhasil diambil.',
            'data' => CashBankAccountResource::collection($cashBanks),
        ]);
    }

    public function store(CreateCashBankAccountRequest $request)
    {
        $data = array_merge([
            'is_active' => true,
        ], $request->validated());

        $cashBank = CashBankAccount::create($data);
        $cashBank->load('account');

        return response()->json([
            'success' => true,
            'message' => 'Akun kas/bank baru berhasil dibuat.',
            'data' => new CashBankAccountResource($cashBank),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $cashBank = CashBankAccount::findOrFail($id);

        $validated = $request->validate([
            'account_id' => [
                'required',
                'exists:accounts,id',
                \Illuminate\Validation\Rule::unique('cash_bank_accounts', 'account_id')->ignore($cashBank->id),
            ],
            'type' => 'required|in:CASH,BANK',
            'name' => 'required|string|max:150',
            'bank_name' => 'nullable|string|max:150',
            'account_number' => 'nullable|string|max:100',
            'account_holder' => 'nullable|string|max:150',
            'is_active' => 'nullable|boolean',
        ]);

        $cashBank->update($validated);
        $cashBank->load('account');

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'CASH_BANK_UPDATED',
            'entity_type' => 'CashBankAccount',
            'entity_id' => $cashBank->id,
            'description' => "Akun kas & bank [{$cashBank->name}] telah diperbarui.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Akun kas/bank berhasil diperbarui.',
            'data' => new CashBankAccountResource($cashBank),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $cashBank = CashBankAccount::findOrFail($id);

        // 1. Check if used in transactions
        if (Transaction::where('cash_bank_account_id', $cashBank->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Akun kas/bank tidak dapat dihapus karena sudah memiliki riwayat transaksi penerimaan/pengeluaran.',
            ], 422);
        }

        // 2. Check if used in debt payments (pelunasan hutang/piutang)
        if (DebtPayment::where('cash_bank_account_id', $cashBank->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Akun kas/bank tidak dapat dihapus karena memiliki riwayat transaksi pelunasan hutang/piutang.',
            ], 422);
        }

        // 3. Check if current balance from ledger is not zero
        $resource = new CashBankAccountResource($cashBank);
        $balance = (float) $resource->toArray($request)['balance'];
        if (abs($balance) > 0.001) {
            return response()->json([
                'success' => false,
                'message' => 'Akun kas/bank tidak dapat dihapus karena masih memiliki saldo buku besar berjalan.',
            ], 422);
        }

        $name = $cashBank->name;
        $cashBank->delete();

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'CASH_BANK_DELETED',
            'entity_type' => 'CashBankAccount',
            'entity_id' => $id,
            'description' => "Akun kas & bank [{$name}] telah dihapus.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Akun kas/bank [{$name}] berhasil dihapus.",
        ]);
    }
}

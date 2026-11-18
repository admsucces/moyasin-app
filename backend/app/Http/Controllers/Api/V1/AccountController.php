<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateAccountRequest;
use App\Http\Requests\UpdateAccountRequest;
use App\Http\Resources\AccountResource;
use App\Models\Account;
use App\Models\AuditLog;
use App\Models\CashBankAccount;
use App\Models\FixedAsset;
use App\Models\JournalEntry;
use App\Models\Payable;
use App\Models\Receivable;
use App\Models\Transaction;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function index(Request $request)
    {
        $query = Account::with('parent');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('parent_id')) {
            $query->where('parent_id', $request->parent_id);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('is_postable')) {
            $query->where('is_postable', filter_var($request->is_postable, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%");
            });
        }

        $accounts = $query->orderBy('code', 'asc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar akun COA berhasil diambil.',
            'data' => AccountResource::collection($accounts),
        ]);
    }

    public function store(CreateAccountRequest $request)
    {
        $data = array_merge([
            'is_active' => true,
            'is_postable' => true,
        ], $request->validated());

        $account = Account::create($data);
        $account->load('parent');

        return response()->json([
            'success' => true,
            'message' => 'Akun COA baru berhasil dibuat.',
            'data' => new AccountResource($account),
        ], 201);
    }

    public function update(UpdateAccountRequest $request, $id)
    {
        $account = Account::findOrFail($id);
        
        // Prevent circular parent hierarchy
        if ($request->filled('parent_id') && (int)$request->parent_id === (int)$account->id) {
            return response()->json([
                'success' => false,
                'message' => 'Akun tidak dapat menjadi parent untuk dirinya sendiri.',
            ], 422);
        }

        $account->update($request->validated());
        $account->load('parent');

        return response()->json([
            'success' => true,
            'message' => 'Data akun COA berhasil diperbarui.',
            'data' => new AccountResource($account),
        ]);
    }

    public function deactivate($id)
    {
        $account = Account::findOrFail($id);
        
        // Historical integrity: Deactivate instead of hard delete
        $account->update(['is_active' => false]);
        $account->load('parent');

        return response()->json([
            'success' => true,
            'message' => 'Akun COA berhasil dinonaktifkan.',
            'data' => new AccountResource($account),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $account = Account::findOrFail($id);

        // 1. Check if has children (sub-accounts)
        if (Account::where('parent_id', $account->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Akun tidak dapat dihapus karena masih memiliki sub-akun. Hapus atau pindahkan sub-akun terlebih dahulu.',
            ], 422);
        }

        // 2. Check if used in Journal entries (Ledger integrity)
        if (JournalEntry::where('account_id', $account->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Akun tidak dapat dihapus permanen karena sudah memiliki riwayat jurnal buku besar. Silakan gunakan opsi Nonaktifkan.',
            ], 422);
        }

        // 3. Check if used in Transactions (Income / Expense)
        if (Transaction::where('income_account_id', $account->id)->orWhere('expense_account_id', $account->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Akun tidak dapat dihapus permanen karena sudah tercatat dalam transaksi penerimaan/pengeluaran. Silakan gunakan opsi Nonaktifkan.',
            ], 422);
        }

        // 4. Check if linked to Cash & Bank
        if (CashBankAccount::where('account_id', $account->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Akun terikat dengan akun Kas & Bank aktif. Hapus pemetaan Kas & Bank terlebih dahulu.',
            ], 422);
        }

        // 5. Check if linked to Payables
        if (Payable::where('payable_account_id', $account->id)->orWhere('expense_asset_account_id', $account->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Akun terikat dengan data hutang yayasan. Silakan gunakan opsi Nonaktifkan.',
            ], 422);
        }

        // 6. Check if linked to Receivables
        if (Receivable::where('receivable_account_id', $account->id)->orWhere('income_account_id', $account->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Akun terikat dengan data piutang yayasan. Silakan gunakan opsi Nonaktifkan.',
            ], 422);
        }

        // 7. Check if linked to Fixed Assets
        if (FixedAsset::where('asset_account_id', $account->id)
            ->orWhere('accumulated_depr_account_id', $account->id)
            ->orWhere('depreciation_expense_account_id', $account->id)
            ->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Akun terikat dengan master aset tetap atau akumulasi penyusutan. Silakan gunakan opsi Nonaktifkan.',
            ], 422);
        }

        $code = $account->code;
        $name = $account->name;

        $account->delete();

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'ACCOUNT_DELETED',
            'entity_type' => 'Account',
            'entity_id' => $id,
            'description' => "Akun COA [{$code}] {$name} telah dihapus.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Akun COA [{$code}] {$name} berhasil dihapus.",
        ]);
    }
}

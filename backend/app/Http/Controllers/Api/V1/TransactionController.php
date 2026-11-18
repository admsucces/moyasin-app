<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateExpenseRequest;
use App\Http\Requests\CreateIncomeRequest;
use App\Http\Requests\UpdateExpenseRequest;
use App\Http\Requests\UpdateIncomeRequest;
use App\Http\Resources\TransactionResource;
use App\Models\AccountingPeriod;
use App\Models\Transaction;
use App\Services\AuditLogService;
use App\Services\PostingService;
use App\Services\TransactionNumberService;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $query = Transaction::with([
            'accountingPeriod',
            'program',
            'donor',
            'cashBankAccount.account',
            'incomeAccount',
            'expenseAccount',
            'creator',
            'attachments',
        ]);

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('program_id')) {
            $query->where('program_id', $request->program_id);
        }

        if ($request->filled('donor_id')) {
            $query->where('donor_id', $request->donor_id);
        }

        if ($request->filled('created_by')) {
            $query->where('created_by', $request->created_by);
        }

        if ($request->filled('date_from')) {
            $query->where('transaction_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('transaction_date', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('transaction_no', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('counterparty_name', 'like', "%{$search}%");
            });
        }

        // Ownership filtering for Pengelola (if policy restricts viewing all)
        $user = $request->user();
        if ($user && $user->isPengelola() && $request->filled('own_only')) {
            $query->where('created_by', $user->id);
        }

        $perPage = min((int) ($request->get('per_page', 25)), 100);
        $transactions = $query->orderBy('transaction_date', 'desc')
                              ->orderBy('id', 'desc')
                              ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Daftar transaksi berhasil diambil.',
            'data' => TransactionResource::collection($transactions->items()),
            'meta' => [
                'page' => $transactions->currentPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
                'total_pages' => $transactions->lastPage(),
            ],
        ]);
    }

    public function storeIncome(CreateIncomeRequest $request)
    {
        $period = AccountingPeriod::where('status', 'OPEN')
            ->where('start_date', '<=', $request->transaction_date)
            ->where('end_date', '>=', $request->transaction_date)
            ->firstOrFail();

        $transactionNo = TransactionNumberService::generate($request->transaction_date);

        $transaction = Transaction::create([
            'transaction_no' => $transactionNo,
            'type' => 'INCOME',
            'transaction_date' => $request->transaction_date,
            'accounting_period_id' => $period->id,
            'cash_bank_account_id' => $request->cash_bank_account_id,
            'income_account_id' => $request->income_account_id,
            'donor_id' => $request->donor_id,
            'program_id' => $request->program_id,
            'restriction_type' => $request->restriction_type,
            'amount' => $request->amount,
            'description' => $request->description,
            'status' => 'APPROVED',
            'created_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        PostingService::postTransaction($transaction, $request->user());
        $transaction->refresh();

        AuditLogService::log(
            $request->user(),
            'TRANSACTION_POSTED',
            'Transaction',
            $transaction->id,
            "Membuat & langsung memposting transaksi penerimaan {$transaction->transaction_no} sejumlah Rp " . number_format($transaction->amount, 2)
        );

        $transaction->load([
            'accountingPeriod',
            'program',
            'donor',
            'cashBankAccount.account',
            'incomeAccount',
            'expenseAccount',
            'creator',
            'attachments',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Transaksi penerimaan berhasil dicatat dan diposting (POSTED).',
            'data' => new TransactionResource($transaction),
        ], 201);
    }

    public function storeExpense(CreateExpenseRequest $request)
    {
        $period = AccountingPeriod::where('status', 'OPEN')
            ->where('start_date', '<=', $request->transaction_date)
            ->where('end_date', '>=', $request->transaction_date)
            ->firstOrFail();

        $transactionNo = TransactionNumberService::generate($request->transaction_date);

        $transaction = Transaction::create([
            'transaction_no' => $transactionNo,
            'type' => 'EXPENSE',
            'transaction_date' => $request->transaction_date,
            'accounting_period_id' => $period->id,
            'cash_bank_account_id' => $request->cash_bank_account_id,
            'expense_account_id' => $request->expense_account_id,
            'counterparty_name' => $request->counterparty_name,
            'program_id' => $request->program_id,
            'amount' => $request->amount,
            'description' => $request->description,
            'status' => 'APPROVED',
            'created_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        PostingService::postTransaction($transaction, $request->user());
        $transaction->refresh();

        AuditLogService::log(
            $request->user(),
            'TRANSACTION_POSTED',
            'Transaction',
            $transaction->id,
            "Membuat & langsung memposting transaksi pengeluaran {$transaction->transaction_no} sejumlah Rp " . number_format($transaction->amount, 2)
        );

        $transaction->load([
            'accountingPeriod',
            'program',
            'donor',
            'cashBankAccount.account',
            'incomeAccount',
            'expenseAccount',
            'creator',
            'attachments',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Transaksi pengeluaran berhasil dicatat dan diposting (POSTED).',
            'data' => new TransactionResource($transaction),
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $transaction = Transaction::with([
            'accountingPeriod',
            'program',
            'donor',
            'cashBankAccount.account',
            'incomeAccount',
            'expenseAccount',
            'creator',
            'attachments',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail transaksi berhasil diambil.',
            'data' => new TransactionResource($transaction),
        ]);
    }

    public function update(Request $request, $id)
    {
        $transaction = Transaction::findOrFail($id);

        if ($transaction->isPosted()) {
            return response()->json([
                'success' => false,
                'message' => 'Transaksi yang telah POSTED tidak dapat diedit langsung.',
            ], 409);
        }

        if ($transaction->type === 'EXPENSE') {
            $formRequest = app(UpdateExpenseRequest::class);
            $formRequest->setContainer(app())->setRedirector(app('redirect'));
            $validated = $formRequest->validated();
        } else {
            $formRequest = app(UpdateIncomeRequest::class);
            $validated = $formRequest->validated();
        }

        $transaction->update($validated);

        AuditLogService::log(
            $request->user(),
            'TRANSACTION_UPDATED',
            'Transaction',
            $transaction->id,
            "Memperbarui transaksi {$transaction->transaction_no}"
        );

        $transaction->load([
            'accountingPeriod',
            'program',
            'donor',
            'cashBankAccount.account',
            'incomeAccount',
            'expenseAccount',
            'creator',
            'attachments',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Transaksi DRAFT berhasil diperbarui.',
            'data' => new TransactionResource($transaction),
        ]);
    }

    public function submit(Request $request, $id)
    {
        $user = $request->user();
        $transaction = Transaction::findOrFail($id);

        if (!$transaction->isEditableBy($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak berhak men-submit transaksi ini.',
            ], 403);
        }

        if (!$transaction->isDraft() && $transaction->status !== 'REJECTED') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya transaksi berstatus DRAFT yang dapat diajukan (submit).',
            ], 409);
        }

        $transaction->update([
            'status' => 'SUBMITTED',
            'submitted_at' => now(),
        ]);

        AuditLogService::log(
            $user,
            'TRANSACTION_SUBMITTED',
            'Transaction',
            $transaction->id,
            "Mengajukan (submit) transaksi {$transaction->transaction_no} untuk persetujuan Owner"
        );

        $transaction->load([
            'accountingPeriod',
            'program',
            'donor',
            'cashBankAccount.account',
            'incomeAccount',
            'expenseAccount',
            'creator',
            'attachments',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Transaksi berhasil disubmit untuk pengajuan approval.',
            'data' => new TransactionResource($transaction),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $transaction = Transaction::findOrFail($id);
        $user = $request->user();

        \Illuminate\Support\Facades\DB::transaction(function () use ($transaction, $id, $user) {
            if ($transaction->journal) {
                $transaction->journal->entries()->delete();
                $transaction->journal->delete();
            }
            $transaction->attachments()->delete();
            $transaction->approvals()->delete();
            $transaction->delete();

            AuditLogService::log(
                $user,
                'TRANSACTION_DELETED',
                'Transaction',
                $id,
                "Menghapus transaksi {$transaction->transaction_no}"
            );
        });

        return response()->json([
            'success' => true,
            'message' => 'Transaksi berhasil dihapus.',
        ]);
    }
}

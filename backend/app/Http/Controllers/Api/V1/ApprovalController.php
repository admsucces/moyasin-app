<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApproveTransactionRequest;
use App\Http\Requests\RejectTransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Approval;
use App\Models\Transaction;
use Illuminate\Http\Request;

class ApprovalController extends Controller
{
    public function pendingQueue(Request $request)
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
            'approvals.actor',
        ])->where('status', 'SUBMITTED');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('program_id')) {
            $query->where('program_id', $request->program_id);
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

        $perPage = min((int) ($request->get('per_page', 25)), 100);
        $transactions = $query->orderBy('submitted_at', 'asc')
                              ->orderBy('id', 'asc')
                              ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Daftar transaksi menunggu persetujuan berhasil diambil.',
            'data' => TransactionResource::collection($transactions->items()),
            'meta' => [
                'page' => $transactions->currentPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
                'total_pages' => $transactions->lastPage(),
            ],
        ]);
    }

    public function approve(ApproveTransactionRequest $request, $id)
    {
        $transaction = Transaction::findOrFail($id);

        if (!$transaction->isSubmitted()) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya transaksi berstatus SUBMITTED yang dapat disetujui (approve).',
            ], 409);
        }

        $transaction->update([
            'status' => 'APPROVED',
            'approved_at' => now(),
        ]);

        Approval::create([
            'transaction_id' => $transaction->id,
            'action' => 'APPROVED',
            'actor_id' => $request->user()->id,
            'comments' => $request->comments,
            'created_at' => now(),
        ]);

        $transaction->load([
            'accountingPeriod',
            'program',
            'donor',
            'cashBankAccount.account',
            'incomeAccount',
            'expenseAccount',
            'creator',
            'attachments',
            'approvals.actor',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Transaksi berhasil disetujui (APPROVED).',
            'data' => new TransactionResource($transaction),
        ]);
    }

    public function reject(RejectTransactionRequest $request, $id)
    {
        $transaction = Transaction::findOrFail($id);

        if (!$transaction->isSubmitted()) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya transaksi berstatus SUBMITTED yang dapat ditolak (reject).',
            ], 409);
        }

        $transaction->update([
            'status' => 'REJECTED',
        ]);

        Approval::create([
            'transaction_id' => $transaction->id,
            'action' => 'REJECTED',
            'actor_id' => $request->user()->id,
            'comments' => $request->reason,
            'created_at' => now(),
        ]);

        $transaction->load([
            'accountingPeriod',
            'program',
            'donor',
            'cashBankAccount.account',
            'incomeAccount',
            'expenseAccount',
            'creator',
            'attachments',
            'approvals.actor',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Transaksi berhasil ditolak (REJECTED).',
            'data' => new TransactionResource($transaction),
        ]);
    }
}

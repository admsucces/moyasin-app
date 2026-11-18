<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\JournalResource;
use App\Models\Transaction;
use App\Services\AuditLogService;
use App\Services\PostingService;
use Illuminate\Http\Request;

class PostingController extends Controller
{
    public function postTransaction(Request $request, $id)
    {
        $transaction = Transaction::findOrFail($id);

        try {
            $journal = PostingService::postTransaction($transaction, $request->user());

            AuditLogService::log(
                $request->user(),
                'TRANSACTION_POSTED',
                'Transaction',
                $transaction->id,
                "Memposting transaksi {$transaction->transaction_no} ke Jurnal Umum ({$journal->journal_no})"
            );

            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil diposting ke Jurnal Umum.',
                'data' => [
                    'transaction_id' => $transaction->id,
                    'status' => 'POSTED',
                    'journal' => new JournalResource($journal),
                ],
            ]);
        } catch (\DomainException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 409);
        }
    }
}

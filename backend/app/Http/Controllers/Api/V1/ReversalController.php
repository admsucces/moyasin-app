<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\JournalResource;
use App\Models\Transaction;
use App\Services\AuditLogService;
use App\Services\ReversalService;
use Illuminate\Http\Request;

class ReversalController extends Controller
{
    public function reverseTransaction(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|min:5|max:500',
        ], [
            'reason.required' => 'Alasan pembalikan (reversal) transaksi wajib diisi.',
            'reason.min' => 'Alasan pembalikan minimal 5 karakter.',
        ]);

        $transaction = Transaction::findOrFail($id);

        try {
            $reversalJournal = ReversalService::reverseTransaction($transaction, $request->user(), $request->reason);

            AuditLogService::log(
                $request->user(),
                'TRANSACTION_REVERSED',
                'Transaction',
                $transaction->id,
                "Melakukan pembalikan (reversal) transaksi {$transaction->transaction_no}. Alasan: {$request->reason}"
            );

            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil di-reverse. Jurnal pembalik telah dibuat.',
                'data' => [
                    'transaction_id' => $transaction->id,
                    'status' => 'REVERSED',
                    'reversal_journal' => new JournalResource($reversalJournal),
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

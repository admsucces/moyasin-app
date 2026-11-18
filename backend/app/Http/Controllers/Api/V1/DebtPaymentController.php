<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CashBankAccount;
use App\Models\DebtPayment;
use App\Models\Journal;
use App\Models\JournalEntry;
use App\Models\Payable;
use App\Models\Receivable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DebtPaymentController extends Controller
{
    public function update(Request $request, $id)
    {
        $payment = DebtPayment::with(['payable', 'receivable'])->findOrFail($id);

        $request->validate([
            'payment_date' => 'required|date',
            'amount' => 'required|numeric|min:1',
            'cash_bank_account_id' => 'required|exists:cash_bank_accounts,id',
            'notes' => 'nullable|string',
        ]);

        $newAmount = (float) $request->amount;
        $cashBank = CashBankAccount::with('account')->findOrFail($request->cash_bank_account_id);
        $user = $request->user();

        // Validation against maximum available balance
        if ($payment->payable_id) {
            $payable = $payment->payable;
            $maxAllowed = (float) $payable->remaining_balance + (float) $payment->amount;
            if ($newAmount > $maxAllowed) {
                return response()->json([
                    'success' => false,
                    'message' => "Jumlah pembayaran melebihi sisa saldo hutang (Maksimal: Rp " . number_format($maxAllowed, 0, ',', '.') . ").",
                ], 422);
            }
        } elseif ($payment->receivable_id) {
            $receivable = $payment->receivable;
            $maxAllowed = (float) $receivable->remaining_balance + (float) $payment->amount;
            if ($newAmount > $maxAllowed) {
                return response()->json([
                    'success' => false,
                    'message' => "Jumlah penerimaan melebihi sisa saldo piutang (Maksimal: Rp " . number_format($maxAllowed, 0, ',', '.') . ").",
                ], 422);
            }
        }

        DB::transaction(function () use ($payment, $request, $newAmount, $cashBank) {
            // 1. Update Payment Record
            $payment->update([
                'payment_date' => $request->payment_date,
                'amount' => $newAmount,
                'cash_bank_account_id' => $cashBank->id,
                'notes' => $request->notes,
            ]);

            // 2. Update Linked Journal Entry if exist
            if ($payment->journal_id) {
                $journal = Journal::find($payment->journal_id);
                if ($journal) {
                    $journal->update(['journal_date' => $request->payment_date]);

                    JournalEntry::where('journal_id', $journal->id)->delete();

                    if ($payment->payable_id) {
                        $payable = Payable::find($payment->payable_id);
                        // Debit: Akun Utang
                        JournalEntry::create([
                            'journal_id' => $journal->id,
                            'account_id' => $payable->payable_account_id,
                            'debit' => $newAmount,
                            'credit' => 0,
                            'description' => "Pelunasan Hutang {$payable->payable_no}",
                        ]);

                        // Credit: Kas / Bank Account
                        JournalEntry::create([
                            'journal_id' => $journal->id,
                            'account_id' => $cashBank->account_id,
                            'debit' => 0,
                            'credit' => $newAmount,
                            'description' => "Pengeluaran {$cashBank->name} untuk pelunasan hutang",
                        ]);
                    } elseif ($payment->receivable_id) {
                        $receivable = Receivable::find($payment->receivable_id);
                        // Debit: Kas / Bank Account
                        JournalEntry::create([
                            'journal_id' => $journal->id,
                            'account_id' => $cashBank->account_id,
                            'debit' => $newAmount,
                            'credit' => 0,
                            'description' => "Penerimaan {$cashBank->name} pelunasan piutang",
                        ]);

                        // Credit: Akun Piutang
                        JournalEntry::create([
                            'journal_id' => $journal->id,
                            'account_id' => $receivable->receivable_account_id,
                            'debit' => 0,
                            'credit' => $newAmount,
                            'description' => "Pelunasan Piutang {$receivable->receivable_no}",
                        ]);
                    }
                }
            }

            // 3. Recalculate Parent Balance & Status
            if ($payment->payable_id) {
                $payable = Payable::find($payment->payable_id);
                $totalPaid = (float) DebtPayment::where('payable_id', $payable->id)->sum('amount');
                $remaining = max(0, (float) $payable->total_amount - $totalPaid);
                $status = $remaining <= 0 ? 'PAID' : ($totalPaid > 0 ? 'PARTIAL' : 'UNPAID');

                $payable->update([
                    'paid_amount' => $totalPaid,
                    'remaining_balance' => $remaining,
                    'status' => $status,
                ]);
            } elseif ($payment->receivable_id) {
                $receivable = Receivable::find($payment->receivable_id);
                $totalReceived = (float) DebtPayment::where('receivable_id', $receivable->id)->sum('amount');
                $remaining = max(0, (float) $receivable->total_amount - $totalReceived);
                $status = $remaining <= 0 ? 'PAID' : ($totalReceived > 0 ? 'PARTIAL' : 'UNPAID');

                $receivable->update([
                    'received_amount' => $totalReceived,
                    'remaining_balance' => $remaining,
                    'status' => $status,
                ]);
            }
        });

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'DEBT_PAYMENT_UPDATED',
            'entity_type' => 'DebtPayment',
            'entity_id' => $payment->id,
            'description' => "Pembaruan rincian pembayaran [{$payment->payment_no}] berhasil.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Catatan pembayaran berhasil diperbarui.',
            'data' => $payment->fresh(['cashBankAccount']),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $payment = DebtPayment::findOrFail($id);
        $user = $request->user();
        $payableId = $payment->payable_id;
        $receivableId = $payment->receivable_id;
        $paymentNo = $payment->payment_no;

        DB::transaction(function () use ($payment, $payableId, $receivableId) {
            // Delete linked journal entry and journal
            if ($payment->journal_id) {
                JournalEntry::where('journal_id', $payment->journal_id)->delete();
                Journal::where('id', $payment->journal_id)->delete();
            }

            $payment->delete();

            // Recalculate Parent Balance & Status
            if ($payableId) {
                $payable = Payable::find($payableId);
                if ($payable) {
                    $totalPaid = (float) DebtPayment::where('payable_id', $payable->id)->sum('amount');
                    $remaining = max(0, (float) $payable->total_amount - $totalPaid);
                    $status = $remaining <= 0 ? 'PAID' : ($totalPaid > 0 ? 'PARTIAL' : 'UNPAID');

                    $payable->update([
                        'paid_amount' => $totalPaid,
                        'remaining_balance' => $remaining,
                        'status' => $status,
                    ]);
                }
            } elseif ($receivableId) {
                $receivable = Receivable::find($receivableId);
                if ($receivable) {
                    $totalReceived = (float) DebtPayment::where('receivable_id', $receivable->id)->sum('amount');
                    $remaining = max(0, (float) $receivable->total_amount - $totalReceived);
                    $status = $remaining <= 0 ? 'PAID' : ($totalReceived > 0 ? 'PARTIAL' : 'UNPAID');

                    $receivable->update([
                        'received_amount' => $totalReceived,
                        'remaining_balance' => $remaining,
                        'status' => $status,
                    ]);
                }
            }
        });

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'DEBT_PAYMENT_DELETED',
            'entity_type' => 'DebtPayment',
            'entity_id' => $id,
            'description' => "Penghapusan catatan pembayaran [{$paymentNo}] berhasil.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Catatan pembayaran berhasil dihapus.',
        ]);
    }
}

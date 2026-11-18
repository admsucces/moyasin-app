<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\AuditLog;
use App\Models\CashBankAccount;
use App\Models\DebtPayment;
use App\Models\Journal;
use App\Models\JournalEntry;
use App\Models\Receivable;
use App\Services\JournalNumberService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReceivableController extends Controller
{
    public function index(Request $request)
    {
        $query = Receivable::with(['donor', 'receivableAccount', 'incomeAccount', 'journal']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('receivable_no', 'like', "%{$search}%")
                  ->orWhere('invoice_no', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $receivables = $query->orderBy('due_date', 'asc')->get();

        $today = date('Y-m-d');
        $totalAmount = (float) $receivables->sum('total_amount');
        $totalReceived = (float) $receivables->sum('received_amount');
        $totalRemaining = (float) $receivables->sum('remaining_balance');
        $overdueCount = $receivables->filter(function ($r) use ($today) {
            $dueDate = $r->due_date ? $r->due_date->format('Y-m-d') : null;
            return $r->status !== 'PAID' && $r->status !== 'CANCELLED' && $dueDate && $dueDate < $today;
        })->count();
        $unpaidCount = $receivables->where('status', '!=', 'PAID')->count();

        return response()->json([
            'success' => true,
            'message' => 'Daftar piutang (Accounts Receivable) berhasil diambil.',
            'data' => [
                'receivables' => $receivables,
                'summary' => [
                    'total_count' => $receivables->count(),
                    'total_amount' => $totalAmount,
                    'total_received' => $totalReceived,
                    'total_remaining' => $totalRemaining,
                    'total_unpaid_amount' => $totalRemaining,
                    'overdue_count' => $overdueCount,
                    'unpaid_count' => $unpaidCount,
                ],
            ],
        ]);
    }

    public function show($id)
    {
        $receivable = Receivable::with(['donor', 'receivableAccount', 'incomeAccount', 'journal.entries.account', 'payments.cashBankAccount', 'payments.creator'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail piutang berhasil diambil.',
            'data' => $receivable,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'customer_name' => 'required|string|max:150',
            'donor_id' => 'nullable|exists:donors,id',
            'invoice_no' => 'nullable|string|max:100',
            'transaction_date' => 'required|date',
            'due_date' => 'required|date',
            'total_amount' => 'required|numeric|min:1',
            'receivable_account_id' => 'required|exists:accounts,id',
            'income_account_id' => 'nullable|exists:accounts,id',
            'description' => 'nullable|string',
        ]);

        $transactionDate = $request->transaction_date;
        $totalAmount = (float) $request->total_amount;

        $period = AccountingPeriod::where('start_date', '<=', $transactionDate)
            ->where('end_date', '>=', $transactionDate)
            ->first();

        if (!$period) {
            $period = AccountingPeriod::where('status', 'OPEN')->first();
        }

        if (!$period) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada periode akuntansi aktif untuk tanggal pengakuan piutang ini.',
            ], 422);
        }

        // Default income account if not provided (e.g. 4104 or INCOME type)
        $incomeAccountId = $request->income_account_id;
        if (!$incomeAccountId) {
            $defaultAcc = Account::where('code', '4104')
                ->orWhere('type', 'INCOME')
                ->where('is_postable', true)
                ->first();
            $incomeAccountId = $defaultAcc ? $defaultAcc->id : $request->receivable_account_id;
        }

        $user = $request->user();

        $receivable = DB::transaction(function () use ($request, $transactionDate, $totalAmount, $period, $incomeAccountId, $user) {
            $receivableNo = 'PTG-' . date('Ymd', strtotime($transactionDate)) . '-' . rand(100, 999);
            $invoiceNo = $request->filled('invoice_no') ? $request->invoice_no : 'INV-PTG-' . date('Ymd', strtotime($transactionDate)) . '-' . rand(100, 999);

            // 1. Post Initial Recognition Journal: Debit Receivable Account (1104), Credit Income Account (4104)
            $journalNo = JournalNumberService::generate($transactionDate);
            $journal = Journal::create([
                'journal_no' => $journalNo,
                'transaction_id' => null,
                'journal_date' => $transactionDate,
                'accounting_period_id' => $period->id,
                'description' => "Pengakuan Tagihan Piutang [{$receivableNo}] Pihak: {$request->customer_name}",
                'status' => 'POSTED',
                'created_by' => $user->id,
                'posted_by' => $user->id,
                'posted_at' => now(),
            ]);

            // Debit: Akun Piutang (e.g. 1104)
            JournalEntry::create([
                'journal_id' => $journal->id,
                'account_id' => $request->receivable_account_id,
                'debit' => $totalAmount,
                'credit' => 0,
                'description' => "Pengakuan Piutang Usaha / Donasi {$receivableNo}",
            ]);

            // Credit: Akun Pendapatan / Sumbangan (e.g. 4104)
            JournalEntry::create([
                'journal_id' => $journal->id,
                'account_id' => $incomeAccountId,
                'debit' => 0,
                'credit' => $totalAmount,
                'description' => "Pengakuan Pendapatan Donasi / Tagihan dari {$request->customer_name}",
            ]);

            // 2. Create Receivable Record
            $rc = Receivable::create([
                'receivable_no' => $receivableNo,
                'invoice_no' => $invoiceNo,
                'donor_id' => $request->donor_id,
                'customer_name' => $request->customer_name,
                'transaction_date' => $transactionDate,
                'due_date' => $request->due_date,
                'total_amount' => $totalAmount,
                'received_amount' => 0,
                'remaining_balance' => $totalAmount,
                'status' => 'UNPAID',
                'receivable_account_id' => $request->receivable_account_id,
                'income_account_id' => $incomeAccountId,
                'journal_id' => $journal->id,
                'description' => $request->description,
            ]);

            return $rc;
        });

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'RECEIVABLE_CREATED',
            'entity_type' => 'Receivable',
            'entity_id' => $receivable->id,
            'description' => "Pencatatan Tagihan/Piutang baru [{$receivable->receivable_no}] Pihak: {$receivable->customer_name} Rp " . number_format($receivable->total_amount, 0, ',', '.') . " dan Jurnal Pengakuan diposting.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Catatan piutang baru berhasil disimpan dan diposting ke Jurnal Umum.',
            'data' => $receivable->load(['donor', 'receivableAccount', 'incomeAccount', 'journal']),
        ], 201);
    }

    public function receive(Request $request, $id)
    {
        $receivable = Receivable::findOrFail($id);

        if ($receivable->status === 'PAID' || $receivable->remaining_balance <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Piutang ini sudah lunas (PAID).',
            ], 422);
        }

        $request->validate([
            'payment_date' => 'required|date',
            'amount' => 'required|numeric|min:1|max:' . $receivable->remaining_balance,
            'cash_bank_account_id' => 'required|exists:cash_bank_accounts,id',
            'notes' => 'nullable|string',
        ]);

        $paymentDate = $request->payment_date;
        $amount = (float) $request->amount;

        $period = AccountingPeriod::where('start_date', '<=', $paymentDate)
            ->where('end_date', '>=', $paymentDate)
            ->first();

        if (!$period) {
            $period = AccountingPeriod::where('status', 'OPEN')->first();
        }

        if (!$period) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada periode akuntansi aktif untuk tanggal penerimaan ini.',
            ], 422);
        }

        $cashBank = CashBankAccount::with('account')->findOrFail($request->cash_bank_account_id);
        $user = $request->user();

        $debtPayment = DB::transaction(function () use ($receivable, $request, $paymentDate, $amount, $cashBank, $period, $user) {
            // 1. Post Settlement Journal: Debit Kas/Bank, Credit Piutang (1104)
            $journalNo = JournalNumberService::generate($paymentDate);
            $journal = Journal::create([
                'journal_no' => $journalNo,
                'transaction_id' => null,
                'journal_date' => $paymentDate,
                'accounting_period_id' => $period->id,
                'description' => "Penerimaan Pelunasan Piutang [{$receivable->receivable_no}] dari {$receivable->customer_name}",
                'status' => 'POSTED',
                'created_by' => $user->id,
                'posted_by' => $user->id,
                'posted_at' => now(),
            ]);

            // Debit: Kas / Bank Account
            JournalEntry::create([
                'journal_id' => $journal->id,
                'account_id' => $cashBank->account_id,
                'debit' => $amount,
                'credit' => 0,
                'description' => "Penerimaan {$cashBank->name} pelunasan piutang",
            ]);

            // Credit: Akun Piutang
            JournalEntry::create([
                'journal_id' => $journal->id,
                'account_id' => $receivable->receivable_account_id,
                'debit' => 0,
                'credit' => $amount,
                'description' => "Pelunasan Piutang {$receivable->receivable_no}",
            ]);

            // 2. Record Payment
            $paymentNo = 'RCV-' . date('Ymd', strtotime($paymentDate)) . '-' . rand(100, 999);
            $pmt = DebtPayment::create([
                'payment_no' => $paymentNo,
                'type' => 'RECEIVABLE_PAYMENT',
                'payable_id' => null,
                'receivable_id' => $receivable->id,
                'payment_date' => $paymentDate,
                'amount' => $amount,
                'cash_bank_account_id' => $cashBank->id,
                'journal_id' => $journal->id,
                'notes' => $request->notes,
                'created_by' => $user->id,
            ]);

            // 3. Update Receivable Balance
            $newReceived = (float) $receivable->received_amount + $amount;
            $newRemaining = max(0, (float) $receivable->total_amount - $newReceived);
            $newStatus = $newRemaining <= 0 ? 'PAID' : 'PARTIAL';

            $receivable->update([
                'received_amount' => $newReceived,
                'remaining_balance' => $newRemaining,
                'status' => $newStatus,
            ]);

            return $pmt;
        });

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'RECEIVABLE_RECEIVED',
            'entity_type' => 'Receivable',
            'entity_id' => $receivable->id,
            'description' => "Penerimaan Pelunasan Piutang [{$receivable->receivable_no}] Rp " . number_format($amount, 0, ',', '.') . " masuk ke {$cashBank->name} berhasil.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Penerimaan piutang berhasil dicatat dan diposting ke Jurnal Umum.',
            'data' => $receivable->fresh(['donor', 'receivableAccount', 'payments.cashBankAccount']),
        ]);
    }

    public function update(Request $request, $id)
    {
        $receivable = Receivable::findOrFail($id);

        $request->validate([
            'customer_name' => 'required|string|max:150',
            'donor_id' => 'nullable|exists:donors,id',
            'invoice_no' => 'nullable|string|max:100',
            'transaction_date' => 'required|date',
            'due_date' => 'required|date',
            'total_amount' => 'required|numeric|min:1',
            'receivable_account_id' => 'required|exists:accounts,id',
            'income_account_id' => 'nullable|exists:accounts,id',
            'description' => 'nullable|string',
        ]);

        $totalAmount = (float) $request->total_amount;
        $receivedAmount = (float) $receivable->received_amount;
        $newRemaining = max(0, $totalAmount - $receivedAmount);
        $newStatus = $receivable->status;

        if ($newRemaining <= 0) {
            $newStatus = 'PAID';
        } else if ($receivedAmount > 0) {
            $newStatus = 'PARTIAL';
        } else {
            $newStatus = 'UNPAID';
        }

        $user = $request->user();

        DB::transaction(function () use ($receivable, $request, $totalAmount, $newRemaining, $newStatus) {
            $receivable->update([
                'customer_name' => $request->customer_name,
                'donor_id' => $request->donor_id,
                'invoice_no' => $request->invoice_no,
                'transaction_date' => $request->transaction_date,
                'due_date' => $request->due_date,
                'total_amount' => $totalAmount,
                'remaining_balance' => $newRemaining,
                'status' => $newStatus,
                'receivable_account_id' => $request->receivable_account_id,
                'income_account_id' => $request->income_account_id ?: $receivable->income_account_id,
                'description' => $request->description,
            ]);

            if ($receivable->journal_id) {
                JournalEntry::where('journal_id', $receivable->journal_id)->delete();

                JournalEntry::create([
                    'journal_id' => $receivable->journal_id,
                    'account_id' => $request->receivable_account_id,
                    'debit' => $totalAmount,
                    'credit' => 0,
                    'description' => "Pengakuan Piutang / Donasi {$receivable->receivable_no}",
                ]);

                JournalEntry::create([
                    'journal_id' => $receivable->journal_id,
                    'account_id' => $receivable->income_account_id,
                    'debit' => 0,
                    'credit' => $totalAmount,
                    'description' => "Pengakuan Pendapatan Donasi / Tagihan dari {$request->customer_name}",
                ]);
            }
        });

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'RECEIVABLE_UPDATED',
            'entity_type' => 'Receivable',
            'entity_id' => $receivable->id,
            'description' => "Pembaruan data Piutang [{$receivable->receivable_no}] berhasil.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Data piutang berhasil diperbarui.',
            'data' => $receivable->load(['donor', 'receivableAccount', 'incomeAccount', 'journal']),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $receivable = Receivable::findOrFail($id);
        $user = $request->user();

        DB::transaction(function () use ($receivable) {
            $payments = DebtPayment::where('receivable_id', $receivable->id)->get();
            foreach ($payments as $pmt) {
                if ($pmt->journal_id) {
                    JournalEntry::where('journal_id', $pmt->journal_id)->delete();
                    Journal::where('id', $pmt->journal_id)->delete();
                }
                $pmt->delete();
            }

            if ($receivable->journal_id) {
                JournalEntry::where('journal_id', $receivable->journal_id)->delete();
                Journal::where('id', $receivable->journal_id)->delete();
            }

            $receivable->delete();
        });

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'RECEIVABLE_DELETED',
            'entity_type' => 'Receivable',
            'entity_id' => $id,
            'description' => "Penghapusan data Piutang [{$receivable->receivable_no}] berhasil.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Data piutang berhasil dihapus.',
        ]);
    }
}

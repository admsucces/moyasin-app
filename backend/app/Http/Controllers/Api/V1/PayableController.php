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
use App\Models\Payable;
use App\Services\JournalNumberService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayableController extends Controller
{
    public function index(Request $request)
    {
        $query = Payable::with(['donor', 'payableAccount', 'expenseAssetAccount', 'journal']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('payable_no', 'like', "%{$search}%")
                  ->orWhere('invoice_no', 'like', "%{$search}%")
                  ->orWhere('vendor_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $payables = $query->orderBy('due_date', 'asc')->get();

        $today = date('Y-m-d');
        $totalAmount = (float) $payables->sum('total_amount');
        $totalPaid = (float) $payables->sum('paid_amount');
        $totalRemaining = (float) $payables->sum('remaining_balance');
        $overdueCount = $payables->filter(function ($p) use ($today) {
            $dueDate = $p->due_date ? $p->due_date->format('Y-m-d') : null;
            return $p->status !== 'PAID' && $p->status !== 'CANCELLED' && $dueDate && $dueDate < $today;
        })->count();
        $unpaidCount = $payables->where('status', '!=', 'PAID')->count();

        return response()->json([
            'success' => true,
            'message' => 'Daftar hutang (Accounts Payable) berhasil diambil.',
            'data' => [
                'payables' => $payables,
                'summary' => [
                    'total_count' => $payables->count(),
                    'total_amount' => $totalAmount,
                    'total_paid' => $totalPaid,
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
        $payable = Payable::with(['donor', 'payableAccount', 'expenseAssetAccount', 'journal.entries.account', 'payments.cashBankAccount', 'payments.creator'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail hutang berhasil diambil.',
            'data' => $payable,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'vendor_name' => 'required|string|max:150',
            'donor_id' => 'nullable|exists:donors,id',
            'invoice_no' => 'nullable|string|max:100',
            'transaction_date' => 'required|date',
            'due_date' => 'required|date',
            'total_amount' => 'required|numeric|min:1',
            'payable_account_id' => 'required|exists:accounts,id',
            'expense_asset_account_id' => 'nullable|exists:accounts,id',
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
                'message' => 'Tidak ada periode akuntansi aktif untuk tanggal pengakuan hutang ini.',
            ], 422);
        }

        // Default expense asset account if not provided (e.g. 5201 or EXPENSE type)
        $expenseAssetAccountId = $request->expense_asset_account_id;
        if (!$expenseAssetAccountId) {
            $defaultAcc = Account::where('code', '5201')
                ->orWhere('type', 'EXPENSE')
                ->where('is_postable', true)
                ->first();
            $expenseAssetAccountId = $defaultAcc ? $defaultAcc->id : $request->payable_account_id;
        }

        $user = $request->user();

        $payable = DB::transaction(function () use ($request, $transactionDate, $totalAmount, $period, $expenseAssetAccountId, $user) {
            $payableNo = 'HTG-' . date('Ymd', strtotime($transactionDate)) . '-' . rand(100, 999);
            $invoiceNo = $request->filled('invoice_no') ? $request->invoice_no : 'INV-HTG-' . date('Ymd', strtotime($transactionDate)) . '-' . rand(100, 999);

            // 1. Post Initial Recognition Journal: Debit Expense/Asset, Credit Payable Account
            $journalNo = JournalNumberService::generate($transactionDate);
            $journal = Journal::create([
                'journal_no' => $journalNo,
                'transaction_id' => null,
                'journal_date' => $transactionDate,
                'accounting_period_id' => $period->id,
                'description' => "Pengakuan Kewajiban Hutang [{$payableNo}] Vendor: {$request->vendor_name}",
                'status' => 'POSTED',
                'created_by' => $user->id,
                'posted_by' => $user->id,
                'posted_at' => now(),
            ]);

            // Debit: Akun Beban / Aset (e.g. 5201)
            JournalEntry::create([
                'journal_id' => $journal->id,
                'account_id' => $expenseAssetAccountId,
                'debit' => $totalAmount,
                'credit' => 0,
                'description' => "Pengakuan Beban / Pembelian Kredit dari {$request->vendor_name}",
            ]);

            // Credit: Akun Utang (e.g. 2101)
            JournalEntry::create([
                'journal_id' => $journal->id,
                'account_id' => $request->payable_account_id,
                'debit' => 0,
                'credit' => $totalAmount,
                'description' => "Pengakuan Utang Usaha {$payableNo}",
            ]);

            // 2. Create Payable Record
            $py = Payable::create([
                'payable_no' => $payableNo,
                'invoice_no' => $invoiceNo,
                'donor_id' => $request->donor_id,
                'vendor_name' => $request->vendor_name,
                'transaction_date' => $transactionDate,
                'due_date' => $request->due_date,
                'total_amount' => $totalAmount,
                'paid_amount' => 0,
                'remaining_balance' => $totalAmount,
                'status' => 'UNPAID',
                'payable_account_id' => $request->payable_account_id,
                'expense_asset_account_id' => $expenseAssetAccountId,
                'journal_id' => $journal->id,
                'description' => $request->description,
            ]);

            return $py;
        });

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'PAYABLE_CREATED',
            'entity_type' => 'Payable',
            'entity_id' => $payable->id,
            'description' => "Pencatatan Kewajiban/Hutang baru [{$payable->payable_no}] Vendor: {$payable->vendor_name} Rp " . number_format($payable->total_amount, 0, ',', '.') . " dan Jurnal Pengakuan diposting.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Catatan hutang baru berhasil disimpan dan diposting ke Jurnal Umum.',
            'data' => $payable->load(['donor', 'payableAccount', 'expenseAssetAccount', 'journal']),
        ], 201);
    }

    public function pay(Request $request, $id)
    {
        $payable = Payable::findOrFail($id);

        if ($payable->status === 'PAID' || $payable->remaining_balance <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Hutang ini sudah lunas (PAID).',
            ], 422);
        }

        $request->validate([
            'payment_date' => 'required|date',
            'amount' => 'required|numeric|min:1|max:' . $payable->remaining_balance,
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
                'message' => 'Tidak ada periode akuntansi aktif untuk tanggal pelunasan ini.',
            ], 422);
        }

        $cashBank = CashBankAccount::with('account')->findOrFail($request->cash_bank_account_id);
        $user = $request->user();

        $debtPayment = DB::transaction(function () use ($payable, $request, $paymentDate, $amount, $cashBank, $period, $user) {
            // 1. Post Settlement Journal: Debit Utang (2101), Credit Kas/Bank
            $journalNo = JournalNumberService::generate($paymentDate);
            $journal = Journal::create([
                'journal_no' => $journalNo,
                'transaction_id' => null,
                'journal_date' => $paymentDate,
                'accounting_period_id' => $period->id,
                'description' => "Pelunasan Hutang [{$payable->payable_no}] kepada {$payable->vendor_name}",
                'status' => 'POSTED',
                'created_by' => $user->id,
                'posted_by' => $user->id,
                'posted_at' => now(),
            ]);

            // Debit: Akun Utang (2101)
            JournalEntry::create([
                'journal_id' => $journal->id,
                'account_id' => $payable->payable_account_id,
                'debit' => $amount,
                'credit' => 0,
                'description' => "Pelunasan Hutang {$payable->payable_no}",
            ]);

            // Credit: Kas / Bank Account
            JournalEntry::create([
                'journal_id' => $journal->id,
                'account_id' => $cashBank->account_id,
                'debit' => 0,
                'credit' => $amount,
                'description' => "Pengeluaran {$cashBank->name} untuk pelunasan hutang",
            ]);

            // 2. Record Payment
            $paymentNo = 'PAY-' . date('Ymd', strtotime($paymentDate)) . '-' . rand(100, 999);
            $pmt = DebtPayment::create([
                'payment_no' => $paymentNo,
                'type' => 'PAYABLE_PAYMENT',
                'payable_id' => $payable->id,
                'receivable_id' => null,
                'payment_date' => $paymentDate,
                'amount' => $amount,
                'cash_bank_account_id' => $cashBank->id,
                'journal_id' => $journal->id,
                'notes' => $request->notes,
                'created_by' => $user->id,
            ]);

            // 3. Update Payable Balance
            $newPaid = (float) $payable->paid_amount + $amount;
            $newRemaining = max(0, (float) $payable->total_amount - $newPaid);
            $newStatus = $newRemaining <= 0 ? 'PAID' : 'PARTIAL';

            $payable->update([
                'paid_amount' => $newPaid,
                'remaining_balance' => $newRemaining,
                'status' => $newStatus,
            ]);

            return $pmt;
        });

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'PAYABLE_PAID',
            'entity_type' => 'Payable',
            'entity_id' => $payable->id,
            'description' => "Pembayaran Hutang [{$payable->payable_no}] Rp " . number_format($amount, 0, ',', '.') . " via {$cashBank->name} berhasil.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pembayaran hutang berhasil dicatat dan diposting ke Jurnal Umum.',
            'data' => $payable->fresh(['donor', 'payableAccount', 'payments.cashBankAccount']),
        ]);
    }

    public function update(Request $request, $id)
    {
        $payable = Payable::findOrFail($id);

        $request->validate([
            'vendor_name' => 'required|string|max:150',
            'donor_id' => 'nullable|exists:donors,id',
            'invoice_no' => 'nullable|string|max:100',
            'transaction_date' => 'required|date',
            'due_date' => 'required|date',
            'total_amount' => 'required|numeric|min:1',
            'payable_account_id' => 'required|exists:accounts,id',
            'expense_asset_account_id' => 'nullable|exists:accounts,id',
            'description' => 'nullable|string',
        ]);

        $totalAmount = (float) $request->total_amount;
        $paidAmount = (float) $payable->paid_amount;
        $newRemaining = max(0, $totalAmount - $paidAmount);
        $newStatus = $payable->status;

        if ($newRemaining <= 0) {
            $newStatus = 'PAID';
        } else if ($paidAmount > 0) {
            $newStatus = 'PARTIAL';
        } else {
            $newStatus = 'UNPAID';
        }

        $user = $request->user();

        DB::transaction(function () use ($payable, $request, $totalAmount, $newRemaining, $newStatus) {
            $payable->update([
                'vendor_name' => $request->vendor_name,
                'donor_id' => $request->donor_id,
                'invoice_no' => $request->invoice_no,
                'transaction_date' => $request->transaction_date,
                'due_date' => $request->due_date,
                'total_amount' => $totalAmount,
                'remaining_balance' => $newRemaining,
                'status' => $newStatus,
                'payable_account_id' => $request->payable_account_id,
                'expense_asset_account_id' => $request->expense_asset_account_id ?: $payable->expense_asset_account_id,
                'description' => $request->description,
            ]);

            if ($payable->journal_id) {
                JournalEntry::where('journal_id', $payable->journal_id)->delete();

                JournalEntry::create([
                    'journal_id' => $payable->journal_id,
                    'account_id' => $payable->expense_asset_account_id,
                    'debit' => $totalAmount,
                    'credit' => 0,
                    'description' => "Pengakuan Beban / Pembelian Kredit dari {$request->vendor_name}",
                ]);

                JournalEntry::create([
                    'journal_id' => $payable->journal_id,
                    'account_id' => $request->payable_account_id,
                    'debit' => 0,
                    'credit' => $totalAmount,
                    'description' => "Pengakuan Utang {$payable->payable_no}",
                ]);
            }
        });

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'PAYABLE_UPDATED',
            'entity_type' => 'Payable',
            'entity_id' => $payable->id,
            'description' => "Pembaruan data Hutang [{$payable->payable_no}] berhasil.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Data hutang berhasil diperbarui.',
            'data' => $payable->load(['donor', 'payableAccount', 'expenseAssetAccount', 'journal']),
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $payable = Payable::findOrFail($id);
        $user = $request->user();

        DB::transaction(function () use ($payable) {
            $payments = DebtPayment::where('payable_id', $payable->id)->get();
            foreach ($payments as $pmt) {
                if ($pmt->journal_id) {
                    JournalEntry::where('journal_id', $pmt->journal_id)->delete();
                    Journal::where('id', $pmt->journal_id)->delete();
                }
                $pmt->delete();
            }

            if ($payable->journal_id) {
                JournalEntry::where('journal_id', $payable->journal_id)->delete();
                Journal::where('id', $payable->journal_id)->delete();
            }

            $payable->delete();
        });

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'PAYABLE_DELETED',
            'entity_type' => 'Payable',
            'entity_id' => $id,
            'description' => "Penghapusan data Hutang [{$payable->payable_no}] berhasil.",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Data hutang berhasil dihapus.',
        ]);
    }
}

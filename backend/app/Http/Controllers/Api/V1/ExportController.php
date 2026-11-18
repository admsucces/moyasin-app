<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Journal;
use App\Models\Transaction;
use App\Services\FinancialReportService;
use App\Services\LedgerService;
use App\Services\TrialBalanceService;
use Illuminate\Http\Request;

class ExportController extends Controller
{
    /**
     * Export Transactions to CSV.
     * GET /api/v1/export/transactions
     */
    public function transactions(Request $request)
    {
        $query = Transaction::with(['accountingPeriod', 'program', 'donor', 'cashBankAccount.account', 'creator']);

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('transaction_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('transaction_date', '<=', $request->date_to);
        }

        $transactions = $query->orderBy('transaction_date', 'desc')->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="Transactions_Export_' . date('Y-m-d') . '.csv"',
        ];

        $callback = function () use ($transactions) {
            $file = fopen('php://output', 'w');
            // Add BOM for UTF-8 Excel support
            fputs($file, "\xEF\xBB\xBF");

            fputcsv($file, [
                'No Transaksi',
                'Tipe',
                'Tanggal',
                'Jumlah (IDR)',
                'Status',
                'Deskripsi',
                'Program',
                'Donatur',
                'Kas/Bank',
                'Dibuat Oleh',
            ]);

            foreach ($transactions as $t) {
                fputcsv($file, [
                    $t->transaction_no,
                    $t->type,
                    $t->transaction_date ? $t->transaction_date->format('Y-m-d') : '',
                    number_format($t->amount, 2, '.', ''),
                    $t->status,
                    $t->description,
                    $t->program?->name ?: '-',
                    $t->donor?->name ?: '-',
                    $t->cashBankAccount?->name ?: '-',
                    $t->creator?->name ?: '-',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Export Journals with Double-Entry items to CSV.
     * GET /api/v1/export/journals
     */
    public function journals(Request $request)
    {
        $query = Journal::with([
            'transaction',
            'accountingPeriod',
            'creator',
            'postedBy',
            'entries.account',
            'entries.program',
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->where('journal_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('journal_date', '<=', $request->date_to);
        }

        if ($request->filled('account_id')) {
            $accountId = $request->account_id;
            $query->whereHas('entries', function ($q) use ($accountId) {
                $q->where('account_id', $accountId);
            });
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('journal_no', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $journals = $query->orderBy('journal_date', 'desc')->orderBy('id', 'desc')->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="Jurnal_Export_' . date('Y-m-d') . '.csv"',
        ];

        $callback = function () use ($journals) {
            $file = fopen('php://output', 'w');
            fputs($file, "\xEF\xBB\xBF");

            fputcsv($file, [
                'No Jurnal',
                'Tanggal',
                'Keterangan / Deskripsi',
                'No Referensi',
                'Status',
                'Kode Akun',
                'Nama Akun',
                'Program',
                'Debit (IDR)',
                'Kredit (IDR)',
                'Dibuat Oleh',
                'Diposting Oleh',
            ]);

            foreach ($journals as $j) {
                $refNo = $j->transaction ? $j->transaction->transaction_no : 'Jurnal Manual';
                $creator = $j->creator?->name ?: '-';
                $postedBy = $j->postedBy?->name ?: ($j->status === 'POSTED' ? 'Sistem' : '-');

                if ($j->entries && count($j->entries) > 0) {
                    foreach ($j->entries as $entry) {
                        fputcsv($file, [
                            $j->journal_no,
                            $j->journal_date ? $j->journal_date->format('Y-m-d') : '',
                            $j->description,
                            $refNo,
                            $j->status,
                            $entry->account?->code ?: '',
                            $entry->account?->name ?: '',
                            $entry->program?->name ?: '-',
                            number_format((float) $entry->debit, 2, '.', ''),
                            number_format((float) $entry->credit, 2, '.', ''),
                            $creator,
                            $postedBy,
                        ]);
                    }
                } else {
                    fputcsv($file, [
                        $j->journal_no,
                        $j->journal_date ? $j->journal_date->format('Y-m-d') : '',
                        $j->description,
                        $refNo,
                        $j->status,
                        '-',
                        '-',
                        '-',
                        '0.00',
                        '0.00',
                        $creator,
                        $postedBy,
                    ]);
                }
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Export Trial Balance to CSV.
     * GET /api/v1/export/reports/trial-balance
     */
    public function trialBalance(Request $request)
    {
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');
        $periodId = $request->query('accounting_period_id');

        $report = TrialBalanceService::getTrialBalance($dateFrom, $dateTo, $periodId);

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="Trial_Balance_Export_' . date('Y-m-d') . '.csv"',
        ];

        $callback = function () use ($report) {
            $file = fopen('php://output', 'w');
            fputs($file, "\xEF\xBB\xBF");

            fputcsv($file, ['Kode Akun', 'Nama Akun', 'Tipe', 'Normal Balance', 'Saldo Awal Debit', 'Saldo Awal Kredit', 'Mutasi Debit', 'Mutasi Kredit', 'Saldo Akhir Debit', 'Saldo Akhir Kredit']);

            foreach ($report['accounts'] as $acc) {
                fputcsv($file, [
                    $acc['account_code'],
                    $acc['account_name'],
                    $acc['account_type'],
                    $acc['normal_balance'],
                    number_format($acc['opening_debit'], 2, '.', ''),
                    number_format($acc['opening_credit'], 2, '.', ''),
                    number_format($acc['period_debit'], 2, '.', ''),
                    number_format($acc['period_credit'], 2, '.', ''),
                    number_format($acc['ending_debit'], 2, '.', ''),
                    number_format($acc['ending_credit'], 2, '.', ''),
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}

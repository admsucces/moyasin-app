<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\AuditLog;
use App\Models\Journal;
use App\Models\JournalEntry;
use App\Services\JournalNumberService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InitialBalanceController extends Controller
{
    /**
     * Get initial balances setup data for all postable accounts.
     */
    public function index(Request $request)
    {
        $accounts = Account::where('is_active', true)
            ->where('is_postable', true)
            ->orderBy('code')
            ->get();

        // Look for existing opening balance journal
        $openingJournal = Journal::where(function ($q) {
            $q->where('journal_no', 'like', 'SA-%')
              ->orWhere('description', 'like', '%Saldo Awal%');
        })
        ->where('status', 'POSTED')
        ->with('entries')
        ->first();

        $asOfDate = $openingJournal ? $openingJournal->journal_date : date('Y-01-01');
        $entriesByAccountId = [];

        if ($openingJournal) {
            foreach ($openingJournal->entries as $entry) {
                $entriesByAccountId[$entry->account_id] = [
                    'debit' => (float) $entry->debit,
                    'credit' => (float) $entry->credit,
                ];
            }
        }

        $formattedAccounts = $accounts->map(function ($acc) use ($entriesByAccountId) {
            $existing = $entriesByAccountId[$acc->id] ?? ['debit' => 0, 'credit' => 0];
            return [
                'id' => $acc->id,
                'code' => $acc->code,
                'name' => $acc->name,
                'type' => $acc->type,
                'normal_balance' => $acc->normal_balance,
                'debit' => $existing['debit'],
                'credit' => $existing['credit'],
            ];
        });

        $totalDebit = $formattedAccounts->sum('debit');
        $totalCredit = $formattedAccounts->sum('credit');

        return response()->json([
            'success' => true,
            'message' => 'Data saldo awal berhasil diambil.',
            'data' => [
                'as_of_date' => $asOfDate,
                'has_setup' => !is_null($openingJournal),
                'journal_no' => $openingJournal ? $openingJournal->journal_no : null,
                'accounts' => $formattedAccounts,
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'is_balanced' => abs($totalDebit - $totalCredit) < 0.01,
            ],
        ]);
    }

    /**
     * Store or update initial balances.
     */
    public function store(Request $request)
    {
        $request->validate([
            'as_of_date' => 'required|date',
            'balances' => 'required|array',
            'balances.*.account_id' => 'required|exists:accounts,id',
            'balances.*.debit' => 'nullable|numeric|min:0',
            'balances.*.credit' => 'nullable|numeric|min:0',
            'auto_balance' => 'nullable|boolean',
        ]);

        $asOfDate = $request->as_of_date;
        $balances = $request->balances;
        $autoBalance = $request->boolean('auto_balance');

        $period = AccountingPeriod::where('start_date', '<=', $asOfDate)
            ->where('end_date', '>=', $asOfDate)
            ->first();

        if (!$period) {
            $period = AccountingPeriod::where('status', 'OPEN')->first();
        }

        if (!$period) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada periode akuntansi aktif yang mencakup tanggal ' . $asOfDate,
            ], 422);
        }

        // Map non-zero entries
        $entriesToCreate = [];
        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($balances as $b) {
            $debit = (float) ($b['debit'] ?? 0);
            $credit = (float) ($b['credit'] ?? 0);

            if ($debit > 0 || $credit > 0) {
                $entriesToCreate[$b['account_id']] = [
                    'account_id' => $b['account_id'],
                    'debit' => $debit,
                    'credit' => $credit,
                ];
                $totalDebit += $debit;
                $totalCredit += $credit;
            }
        }

        // Handle auto-balancing to Equity account (3101 or EQUITY type) if imbalanced
        $diff = round($totalDebit - $totalCredit, 2);
        if ($diff != 0 && $autoBalance) {
            $equityAccount = Account::where('is_postable', true)
                ->where(function ($q) {
                    $q->whereIn('code', ['3101', '3100'])
                      ->orWhere('type', 'EQUITY');
                })
                ->first();

            if ($equityAccount) {
                $existing = $entriesToCreate[$equityAccount->id] ?? [
                    'account_id' => $equityAccount->id,
                    'debit' => 0,
                    'credit' => 0,
                ];

                if ($diff > 0) {
                    // Total Debit > Total Credit -> add Credit to Equity
                    $existing['credit'] += $diff;
                } else {
                    // Total Credit > Total Debit -> add Debit to Equity
                    $existing['debit'] += abs($diff);
                }

                $entriesToCreate[$equityAccount->id] = $existing;
                $totalDebit = array_sum(array_column($entriesToCreate, 'debit'));
                $totalCredit = array_sum(array_column($entriesToCreate, 'credit'));
                $diff = round($totalDebit - $totalCredit, 2);
            }
        }

        if ($diff != 0) {
            return response()->json([
                'success' => false,
                'message' => 'Total Debet (' . number_format($totalDebit, 0, ',', '.') . ') dan Kredit (' . number_format($totalCredit, 0, ',', '.') . ') tidak seimbang. Selisih Rp ' . number_format(abs($diff), 0, ',', '.'),
            ], 422);
        }

        $user = $request->user();

        $journal = DB::transaction(function () use ($asOfDate, $period, $entriesToCreate, $user) {
            // Delete old opening balance journals and journal entries
            $oldJournals = Journal::where(function ($q) {
                $q->where('journal_no', 'like', 'SA-%')
                  ->orWhere('description', 'like', '%Saldo Awal%');
            })->get();

            foreach ($oldJournals as $oldJrn) {
                JournalEntry::where('journal_id', $oldJrn->id)->delete();
                $oldJrn->delete();
            }

            $journalNo = 'SA-' . date('Ymd', strtotime($asOfDate)) . '-001';

            $jrn = Journal::create([
                'journal_no' => $journalNo,
                'transaction_id' => null,
                'journal_date' => $asOfDate,
                'accounting_period_id' => $period->id,
                'description' => 'Setup Saldo Awal Akun Yayasan',
                'status' => 'POSTED',
                'created_by' => $user->id,
                'posted_by' => $user->id,
                'posted_at' => now(),
            ]);

            foreach ($entriesToCreate as $entry) {
                JournalEntry::create([
                    'journal_id' => $jrn->id,
                    'account_id' => $entry['account_id'],
                    'debit' => $entry['debit'],
                    'credit' => $entry['credit'],
                    'description' => 'Saldo Awal Per ' . $asOfDate,
                ]);
            }

            // Audit log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'INITIAL_BALANCE_SET',
                'entity_type' => 'Journal',
                'entity_id' => $jrn->id,
                'description' => "Pengaturan Saldo Awal per tanggal {$asOfDate} berhasil disimpan.",
                'ip_address' => request()->ip(),
            ]);

            return $jrn;
        });

        return response()->json([
            'success' => true,
            'message' => 'Saldo awal berhasil disimpan dan diposting ke Jurnal Umum.',
            'data' => $journal->load('entries.account'),
        ]);
    }
}

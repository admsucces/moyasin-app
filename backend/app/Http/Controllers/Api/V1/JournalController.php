<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateManualJournalRequest;
use App\Http\Resources\JournalResource;
use App\Models\AccountingPeriod;
use App\Models\Journal;
use App\Models\JournalEntry;
use App\Services\JournalNumberService;
use App\Services\JournalValidationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JournalController extends Controller
{
    public function index(Request $request)
    {
        $query = Journal::with([
            'transaction',
            'accountingPeriod',
            'creator',
            'postedBy',
            'entries.account.cashBankAccount',
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

        $perPage = min((int) ($request->get('per_page', 25)), 100);
        $journals = $query->orderBy('journal_date', 'desc')
                          ->orderBy('id', 'desc')
                          ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Daftar jurnal berhasil diambil.',
            'data' => JournalResource::collection($journals->items()),
            'meta' => [
                'page' => $journals->currentPage(),
                'per_page' => $journals->perPage(),
                'total' => $journals->total(),
                'total_pages' => $journals->lastPage(),
            ],
        ]);
    }

    public function show(Request $request, $id)
    {
        $journal = Journal::with([
            'transaction',
            'accountingPeriod',
            'creator',
            'postedBy',
            'entries.account.cashBankAccount',
            'entries.program',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail jurnal berhasil diambil.',
            'data' => new JournalResource($journal),
        ]);
    }

    public function store(CreateManualJournalRequest $request)
    {
        $period = AccountingPeriod::where('status', 'OPEN')
            ->where('start_date', '<=', $request->journal_date)
            ->where('end_date', '>=', $request->journal_date)
            ->firstOrFail();

        // Validate double-entry entries balance & active postable accounts
        JournalValidationService::validateEntries($request->entries);

        $journal = DB::transaction(function () use ($request, $period) {
            $journalNo = JournalNumberService::generate($request->journal_date);
            $user = $request->user();

            $jrn = Journal::create([
                'journal_no' => $journalNo,
                'transaction_id' => null,
                'journal_date' => $request->journal_date,
                'accounting_period_id' => $period->id,
                'description' => $request->description,
                'status' => 'POSTED',
                'created_by' => $user->id,
                'posted_by' => $user->id,
                'posted_at' => now(),
            ]);

            foreach ($request->entries as $entry) {
                JournalEntry::create([
                    'journal_id' => $jrn->id,
                    'account_id' => $entry['account_id'],
                    'program_id' => $entry['program_id'] ?? null,
                    'description' => $entry['description'] ?? null,
                    'debit' => $entry['debit'],
                    'credit' => $entry['credit'],
                ]);
            }

            return $jrn;
        });

        $journal->load([
            'transaction',
            'accountingPeriod',
            'creator',
            'postedBy',
            'entries.account',
            'entries.program',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Jurnal umum manual berhasil dicatat dan diposting.',
            'data' => new JournalResource($journal),
        ], 201);
    }
}

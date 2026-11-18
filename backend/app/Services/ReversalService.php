<?php

namespace App\Services;

use App\Models\AccountingPeriod;
use App\Models\Journal;
use App\Models\JournalEntry;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReversalService
{
    /**
     * Reverses a POSTED transaction by generating an offsetting (swapped Debit/Credit) journal.
     * Updates transaction status to REVERSED atomically.
     */
    public static function reverseTransaction(Transaction $transaction, User $actor, string $reason): Journal
    {
        return DB::transaction(function () use ($transaction, $actor, $reason) {
            $trx = Transaction::where('id', $transaction->id)->lockForUpdate()->firstOrFail();

            if ($trx->isReversed()) {
                throw new \DomainException('Transaksi ini sudah di-reverse sebelumnya.');
            }

            if (!$trx->isPosted()) {
                throw new \DomainException('Hanya transaksi berstatus POSTED yang dapat di-reverse.');
            }

            // Check if period is open
            $period = AccountingPeriod::where('id', $trx->accounting_period_id)->first();
            if ($period && $period->isClosed()) {
                throw ValidationException::withMessages([
                    'period' => ['Tidak dapat membalik transaksi pada periode akuntansi berstatus CLOSED.'],
                ]);
            }

            $originalJournal = Journal::with('entries')->where('transaction_id', $trx->id)->first();
            if (!$originalJournal) {
                throw new \DomainException('Jurnal umum untuk transaksi ini tidak ditemukan.');
            }

            // Generate Reversal Journal Number
            $baseNo = JournalNumberService::generate($trx->transaction_date->format('Y-m-d'));
            $reversalJournalNo = str_replace('JRN-', 'JRN-REV-', $baseNo);

            // Create Reversal Journal Header
            $reversalJournal = Journal::create([
                'journal_no' => $reversalJournalNo,
                'transaction_id' => null,
                'journal_date' => $trx->transaction_date,
                'accounting_period_id' => $trx->accounting_period_id,
                'description' => "Jurnal Pembalik (Reversal): {$trx->description} [Alasan: {$reason}]",
                'status' => 'POSTED',
                'is_reversal' => true,
                'reversed_journal_id' => $originalJournal->id,
                'created_by' => $actor->id,
                'posted_by' => $actor->id,
                'posted_at' => now(),
            ]);

            // Create offsetting entries (Swap Debit & Credit)
            foreach ($originalJournal->entries as $entry) {
                JournalEntry::create([
                    'journal_id' => $reversalJournal->id,
                    'account_id' => $entry->account_id,
                    'program_id' => $entry->program_id,
                    'description' => "Pembalikan: {$entry->description}",
                    'debit' => $entry->credit,  // Swap
                    'credit' => $entry->debit,  // Swap
                ]);
            }

            // Update Transaction state: POSTED -> REVERSED
            $trx->update([
                'status' => 'REVERSED',
                'reversal_reason' => $reason,
                'reversed_at' => now(),
                'reversed_by' => $actor->id,
            ]);

            return $reversalJournal->load(['entries.account', 'entries.program', 'creator', 'postedBy', 'transaction']);
        });
    }
}

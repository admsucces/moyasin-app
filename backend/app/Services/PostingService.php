<?php

namespace App\Services;

use App\Models\AccountingPeriod;
use App\Models\Journal;
use App\Models\JournalEntry;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PostingService
{
    public static function postTransaction(Transaction $transaction, User $postedBy): Journal
    {
        return DB::transaction(function () use ($transaction, $postedBy) {
            // Pessimistic lock on transaction row to prevent race condition double-posting
            $trx = Transaction::where('id', $transaction->id)->lockForUpdate()->firstOrFail();

            if ($trx->isPosted()) {
                throw new \DomainException('Transaksi ini sudah diposting sebelumnya.');
            }

            $openPeriod = AccountingPeriod::where('status', 'OPEN')
                ->where('start_date', '<=', $trx->transaction_date)
                ->where('end_date', '>=', $trx->transaction_date)
                ->first();

            if (!$openPeriod) {
                throw ValidationException::withMessages([
                    'transaction_date' => ['Tanggal transaksi tidak berada pada periode akuntansi berstatus OPEN.'],
                ]);
            }

            // Build Journal Entries according to transaction type
            $entries = [];
            $amount = (float) $trx->amount;

            if ($trx->type === 'INCOME') {
                $cashAccountId = $trx->cashBankAccount?->account_id;
                if (!$cashAccountId) {
                    throw ValidationException::withMessages([
                        'cash_bank_account_id' => ['Akun Kas/Bank transaksi tidak memiliki pemetaan ledger COA.'],
                    ]);
                }

                // Debit: Kas / Bank
                $entries[] = [
                    'account_id' => $cashAccountId,
                    'program_id' => $trx->program_id,
                    'description' => "Penerimaan Kas/Bank: {$trx->description}",
                    'debit' => $amount,
                    'credit' => 0.00,
                ];

                // Kredit: Akun Penerimaan COA
                $entries[] = [
                    'account_id' => $trx->income_account_id,
                    'program_id' => $trx->program_id,
                    'description' => "Pendapatan Penerimaan: {$trx->description}",
                    'debit' => 0.00,
                    'credit' => $amount,
                ];
            } elseif ($trx->type === 'EXPENSE') {
                $cashAccountId = $trx->cashBankAccount?->account_id;
                if (!$cashAccountId) {
                    throw ValidationException::withMessages([
                        'cash_bank_account_id' => ['Akun Kas/Bank transaksi tidak memiliki pemetaan ledger COA.'],
                    ]);
                }

                // Debit: Akun Beban COA
                $entries[] = [
                    'account_id' => $trx->expense_account_id,
                    'program_id' => $trx->program_id,
                    'description' => "Beban Pengeluaran: {$trx->description}",
                    'debit' => $amount,
                    'credit' => 0.00,
                ];

                // Kredit: Kas / Bank
                $entries[] = [
                    'account_id' => $cashAccountId,
                    'program_id' => $trx->program_id,
                    'description' => "Pengeluaran Kas/Bank: {$trx->description}",
                    'debit' => 0.00,
                    'credit' => $amount,
                ];
            } else {
                throw new \DomainException("Tipe transaksi [{$trx->type}] belum didukung untuk posting otomatis.");
            }

            // Validate double-entry balance & postable active accounts
            JournalValidationService::validateEntries($entries);

            // Generate Journal Number
            $journalNo = JournalNumberService::generate($trx->transaction_date->format('Y-m-d'));

            // Create Journal Header
            $journal = Journal::create([
                'journal_no' => $journalNo,
                'transaction_id' => $trx->id,
                'journal_date' => $trx->transaction_date,
                'accounting_period_id' => $openPeriod->id,
                'description' => $trx->description,
                'status' => 'POSTED',
                'created_by' => $trx->created_by,
                'posted_by' => $postedBy->id,
                'posted_at' => now(),
            ]);

            // Save Journal Entries
            foreach ($entries as $entryData) {
                JournalEntry::create([
                    'journal_id' => $journal->id,
                    'account_id' => $entryData['account_id'],
                    'program_id' => $entryData['program_id'],
                    'description' => $entryData['description'],
                    'debit' => $entryData['debit'],
                    'credit' => $entryData['credit'],
                ]);
            }

            // Update Transaction State: APPROVED -> POSTED
            $trx->update([
                'status' => 'POSTED',
                'posted_at' => now(),
            ]);

            return $journal->load(['entries.account', 'entries.program', 'creator', 'postedBy', 'transaction']);
        });
    }
}

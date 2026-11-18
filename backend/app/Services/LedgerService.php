<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Donor;
use App\Models\JournalEntry;
use App\Models\Program;
use Illuminate\Support\Facades\DB;

class LedgerService
{
    /**
     * Helper to resolve Rekanan / Donor / Vendor info from JournalEntry.
     */
    private static function resolveRekanan($entry): ?array
    {
        $journal = $entry->journal;
        if (!$journal) {
            return null;
        }

        if ($journal->transaction && $journal->transaction->donor) {
            return [
                'id' => $journal->transaction->donor->id,
                'code' => $journal->transaction->donor->donor_code,
                'name' => $journal->transaction->donor->name,
                'type' => $journal->transaction->donor->type,
            ];
        }

        if ($journal->transaction && $journal->transaction->counterparty_name) {
            return [
                'id' => null,
                'code' => '-',
                'name' => $journal->transaction->counterparty_name,
                'type' => 'LAINNYA',
            ];
        }

        if ($journal->receivable) {
            if ($journal->receivable->donor) {
                return [
                    'id' => $journal->receivable->donor->id,
                    'code' => $journal->receivable->donor->donor_code,
                    'name' => $journal->receivable->donor->name,
                    'type' => $journal->receivable->donor->type,
                ];
            }
            if ($journal->receivable->customer_name) {
                return [
                    'id' => null,
                    'code' => '-',
                    'name' => $journal->receivable->customer_name,
                    'type' => 'PELANGGAN',
                ];
            }
        }

        if ($journal->payable) {
            if ($journal->payable->donor) {
                return [
                    'id' => $journal->payable->donor->id,
                    'code' => $journal->payable->donor->donor_code,
                    'name' => $journal->payable->donor->name,
                    'type' => $journal->payable->donor->type,
                ];
            }
            if ($journal->payable->vendor_name) {
                return [
                    'id' => null,
                    'code' => '-',
                    'name' => $journal->payable->vendor_name,
                    'type' => 'VENDOR',
                ];
            }
        }

        return null;
    }

    /**
     * Get General Ledger statement for a specific account.
     * Only POSTED journals are included.
     */
    public static function getAccountLedger(int $accountId, ?string $dateFrom = null, ?string $dateTo = null, ?int $programId = null, ?int $donorId = null): array
    {
        $account = Account::findOrFail($accountId);

        // 1. Calculate Opening Balance prior to $dateFrom
        $openingBalance = 0.00;
        if ($dateFrom) {
            $queryOpening = JournalEntry::where('account_id', $accountId)
                ->whereHas('journal', function ($q) use ($dateFrom, $donorId) {
                    $q->where('status', 'POSTED')
                      ->where('journal_date', '<', $dateFrom);
                    
                    if ($donorId) {
                        $q->where(function ($sub) use ($donorId) {
                            $sub->whereHas('transaction', function ($t) use ($donorId) {
                                $t->where('donor_id', $donorId);
                            })->orWhereHas('receivable', function ($r) use ($donorId) {
                                $r->where('donor_id', $donorId);
                            })->orWhereHas('payable', function ($p) use ($donorId) {
                                $p->where('donor_id', $donorId);
                            });
                        });
                    }
                });

            if ($programId) {
                $queryOpening->where('program_id', $programId);
            }

            $openingDebit = (float) $queryOpening->sum('debit');
            $openingCredit = (float) $queryOpening->sum('credit');

            if ($account->normal_balance === 'DEBIT') {
                $openingBalance = $openingDebit - $openingCredit;
            } else {
                $openingBalance = $openingCredit - $openingDebit;
            }
        }

        // 2. Fetch Journal Entries in date range (POSTED only)
        $queryEntries = JournalEntry::with([
            'account',
            'journal.transaction.donor',
            'journal.receivable.donor',
            'journal.payable.donor',
            'journal.postedBy',
            'program',
        ])
        ->where('account_id', $accountId)
        ->whereHas('journal', function ($q) use ($dateFrom, $dateTo, $donorId) {
            $q->where('status', 'POSTED');
            if ($dateFrom) {
                $q->where('journal_date', '>=', $dateFrom);
            }
            if ($dateTo) {
                $q->where('journal_date', '<=', $dateTo);
            }
            if ($donorId) {
                $q->where(function ($sub) use ($donorId) {
                    $sub->whereHas('transaction', function ($t) use ($donorId) {
                        $t->where('donor_id', $donorId);
                    })->orWhereHas('receivable', function ($r) use ($donorId) {
                        $r->where('donor_id', $donorId);
                    })->orWhereHas('payable', function ($p) use ($donorId) {
                        $p->where('donor_id', $donorId);
                    });
                });
            }
        });

        if ($programId) {
            $queryEntries->where('program_id', $programId);
        }

        $entries = $queryEntries->join('journals', 'journal_entries.journal_id', '=', 'journals.id')
            ->select('journal_entries.*')
            ->orderBy('journals.journal_date', 'asc')
            ->orderBy('journals.id', 'asc')
            ->orderBy('journal_entries.id', 'asc')
            ->get();

        // 3. Calculate Running Balance & Period Totals
        $runningBalance = $openingBalance;
        $totalPeriodDebit = 0.00;
        $totalPeriodCredit = 0.00;

        $formattedEntries = [];
        foreach ($entries as $entry) {
            $debit = (float) $entry->debit;
            $credit = (float) $entry->credit;

            $totalPeriodDebit += $debit;
            $totalPeriodCredit += $credit;

            if ($account->normal_balance === 'DEBIT') {
                $runningBalance += ($debit - $credit);
            } else {
                $runningBalance += ($credit - $debit);
            }

            $rekananInfo = self::resolveRekanan($entry);

            $formattedEntries[] = [
                'id' => $entry->id,
                'journal_id' => $entry->journal_id,
                'journal_no' => $entry->journal->journal_no ?? null,
                'journal_date' => $entry->journal->journal_date ? $entry->journal->journal_date->format('Y-m-d') : null,
                'description' => $entry->description ?: ($entry->journal->description ?? ''),
                'reference_no' => $entry->journal->transaction->transaction_no ?? 'MANUAL',
                'transaction_id' => $entry->journal->transaction_id,
                'rekanan' => $rekananInfo,
                'program' => $entry->program ? [
                    'id' => $entry->program->id,
                    'code' => $entry->program->code,
                    'name' => $entry->program->name,
                ] : null,
                'debit' => $debit,
                'credit' => $credit,
                'running_balance' => round($runningBalance, 2),
            ];
        }

        $closingBalance = $runningBalance;

        return [
            'account' => [
                'id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'type' => $account->type,
                'category' => $account->category ?? $account->type,
                'normal_balance' => $account->normal_balance,
                'is_postable' => (bool) $account->is_postable,
            ],
            'filter' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'program_id' => $programId,
                'donor_id' => $donorId,
            ],
            'opening_balance' => round($openingBalance, 2),
            'total_period_debit' => round($totalPeriodDebit, 2),
            'total_period_credit' => round($totalPeriodCredit, 2),
            'closing_balance' => round($closingBalance, 2),
            'entries' => $formattedEntries,
        ];
    }

    /**
     * Get Subsidiary Ledger (Buku Besar Pembantu) statement.
     * Can filter by Account, Donor (Rekanan/Vendor), and/or Program.
     */
    public static function getSubsidiaryLedger(?int $accountId = null, ?int $donorId = null, ?int $programId = null, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        $account = $accountId ? Account::find($accountId) : null;
        $donor = $donorId ? Donor::find($donorId) : null;
        $program = $programId ? Program::find($programId) : null;

        // Normal balance default for calculating running balance if no specific account selected
        $normalBalance = $account ? $account->normal_balance : 'DEBIT';

        // 1. Calculate Opening Balance prior to $dateFrom
        $openingBalance = 0.00;
        if ($dateFrom) {
            $queryOpening = JournalEntry::whereHas('journal', function ($q) use ($dateFrom, $donorId) {
                $q->where('status', 'POSTED')
                  ->where('journal_date', '<', $dateFrom);
                if ($donorId) {
                    $q->where(function ($sub) use ($donorId) {
                        $sub->whereHas('transaction', function ($t) use ($donorId) {
                            $t->where('donor_id', $donorId);
                        })->orWhereHas('receivable', function ($r) use ($donorId) {
                            $r->where('donor_id', $donorId);
                        })->orWhereHas('payable', function ($p) use ($donorId) {
                            $p->where('donor_id', $donorId);
                        });
                    });
                }
            });

            if ($accountId) {
                $queryOpening->where('account_id', $accountId);
            }
            if ($programId) {
                $queryOpening->where('program_id', $programId);
            }

            $openingDebit = (float) $queryOpening->sum('debit');
            $openingCredit = (float) $queryOpening->sum('credit');

            if ($normalBalance === 'DEBIT') {
                $openingBalance = $openingDebit - $openingCredit;
            } else {
                $openingBalance = $openingCredit - $openingDebit;
            }
        }

        // 2. Fetch Journal Entries in date range (POSTED only)
        $queryEntries = JournalEntry::with([
            'account',
            'journal.transaction.donor',
            'journal.receivable.donor',
            'journal.payable.donor',
            'journal.postedBy',
            'program',
        ])
        ->whereHas('journal', function ($q) use ($dateFrom, $dateTo, $donorId) {
            $q->where('status', 'POSTED');
            if ($dateFrom) {
                $q->where('journal_date', '>=', $dateFrom);
            }
            if ($dateTo) {
                $q->where('journal_date', '<=', $dateTo);
            }
            if ($donorId) {
                $q->where(function ($sub) use ($donorId) {
                    $sub->whereHas('transaction', function ($t) use ($donorId) {
                        $t->where('donor_id', $donorId);
                    })->orWhereHas('receivable', function ($r) use ($donorId) {
                        $r->where('donor_id', $donorId);
                    })->orWhereHas('payable', function ($p) use ($donorId) {
                        $p->where('donor_id', $donorId);
                    });
                });
            }
        });

        if ($accountId) {
            $queryEntries->where('account_id', $accountId);
        }
        if ($programId) {
            $queryEntries->where('program_id', $programId);
        }

        $entries = $queryEntries->join('journals', 'journal_entries.journal_id', '=', 'journals.id')
            ->select('journal_entries.*')
            ->orderBy('journals.journal_date', 'asc')
            ->orderBy('journals.id', 'asc')
            ->orderBy('journal_entries.id', 'asc')
            ->get();

        // 3. Calculate Running Balance & Period Totals
        $runningBalance = $openingBalance;
        $totalPeriodDebit = 0.00;
        $totalPeriodCredit = 0.00;

        $formattedEntries = [];
        foreach ($entries as $entry) {
            $debit = (float) $entry->debit;
            $credit = (float) $entry->credit;

            $totalPeriodDebit += $debit;
            $totalPeriodCredit += $credit;

            $entryNormalBalance = $entry->account ? $entry->account->normal_balance : $normalBalance;

            if ($entryNormalBalance === 'DEBIT') {
                $runningBalance += ($debit - $credit);
            } else {
                $runningBalance += ($credit - $debit);
            }

            $rekananInfo = self::resolveRekanan($entry);

            $formattedEntries[] = [
                'id' => $entry->id,
                'journal_id' => $entry->journal_id,
                'journal_no' => $entry->journal->journal_no ?? null,
                'journal_date' => $entry->journal->journal_date ? $entry->journal->journal_date->format('Y-m-d') : null,
                'account' => $entry->account ? [
                    'id' => $entry->account->id,
                    'code' => $entry->account->code,
                    'name' => $entry->account->name,
                    'normal_balance' => $entry->account->normal_balance,
                ] : null,
                'description' => $entry->description ?: ($entry->journal->description ?? ''),
                'reference_no' => $entry->journal->transaction->transaction_no ?? 'MANUAL',
                'transaction_id' => $entry->journal->transaction_id,
                'rekanan' => $rekananInfo,
                'program' => $entry->program ? [
                    'id' => $entry->program->id,
                    'code' => $entry->program->code,
                    'name' => $entry->program->name,
                ] : null,
                'debit' => $debit,
                'credit' => $credit,
                'running_balance' => round($runningBalance, 2),
            ];
        }

        return [
            'account' => $account ? [
                'id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'normal_balance' => $account->normal_balance,
            ] : null,
            'donor' => $donor ? [
                'id' => $donor->id,
                'code' => $donor->donor_code,
                'name' => $donor->name,
                'type' => $donor->type,
            ] : null,
            'program' => $program ? [
                'id' => $program->id,
                'code' => $program->code,
                'name' => $program->name,
            ] : null,
            'filter' => [
                'account_id' => $accountId,
                'donor_id' => $donorId,
                'program_id' => $programId,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
            'opening_balance' => round($openingBalance, 2),
            'total_period_debit' => round($totalPeriodDebit, 2),
            'total_period_credit' => round($totalPeriodCredit, 2),
            'closing_balance' => round($runningBalance, 2),
            'entries' => $formattedEntries,
        ];
    }
}

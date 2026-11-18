<?php

namespace App\Services;

use App\Models\AccountingPeriod;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class PeriodControlService
{
    /**
     * Close an accounting period.
     * Fails if unhandled DRAFT or SUBMITTED transactions exist in period.
     */
    public static function closePeriod(AccountingPeriod $period, User $actor): AccountingPeriod
    {
        // Check for pending/unhandled transactions in this period
        $pendingCount = Transaction::where('accounting_period_id', $period->id)
            ->whereIn('status', ['DRAFT', 'SUBMITTED'])
            ->count();

        if ($pendingCount > 0) {
            throw ValidationException::withMessages([
                'period' => ["Tidak dapat menutup periode karena masih terdapat {$pendingCount} transaksi berstatus DRAFT atau SUBMITTED."],
            ]);
        }

        $period->update([
            'status' => 'CLOSED',
            'closed_at' => now(),
            'closed_by' => $actor->id,
        ]);

        return $period->fresh();
    }

    /**
     * Request reopen for a CLOSED accounting period.
     */
    public static function requestReopenPeriod(AccountingPeriod $period, User $actor, string $reason): AccountingPeriod
    {
        if (!$period->isClosed()) {
            throw new \DomainException('Hanya periode berstatus CLOSED yang dapat diajukan pembukaan kembali.');
        }

        $period->update([
            'status' => 'REOPEN_REQUESTED',
            'reopen_reason' => $reason,
        ]);

        return $period->fresh();
    }

    /**
     * Approve reopen for an accounting period by OWNER.
     */
    public static function approveReopenPeriod(AccountingPeriod $period, User $owner, ?string $reason = null): AccountingPeriod
    {
        if (!$period->isClosed() && !$period->isReopenRequested()) {
            throw new \DomainException('Hanya periode berstatus CLOSED atau REOPEN_REQUESTED yang dapat dibuka kembali.');
        }

        $period->update([
            'status' => 'OPEN',
            'reopened_at' => now(),
            'reopened_by' => $owner->id,
            'reopen_reason' => $reason ?: $period->reopen_reason,
        ]);

        return $period->fresh();
    }
}

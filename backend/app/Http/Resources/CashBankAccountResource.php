<?php

namespace App\Http\Resources;

use App\Models\JournalEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CashBankAccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Calculate derived balance from posted journal entries on this ledger account
        $balance = '0.00';
        if ($this->account_id) {
            $entries = JournalEntry::where('account_id', $this->account_id)
                ->whereHas('journal', function ($query) {
                    $query->where('status', 'POSTED');
                })
                ->get();

            $debit = (float) $entries->sum('debit');
            $credit = (float) $entries->sum('credit');
            $normalBalance = $this->account?->normal_balance ?? 'DEBIT';

            $calculatedBalance = $normalBalance === 'CREDIT' ? ($credit - $debit) : ($debit - $credit);
            $balance = number_format($calculatedBalance, 2, '.', '');
        }

        return [
            'id' => $this->id,
            'account_id' => $this->account_id,
            'type' => $this->type,
            'name' => $this->name,
            'bank_name' => $this->bank_name,
            'account_number' => $this->account_number,
            'account_holder' => $this->account_holder,
            'is_active' => (bool) $this->is_active,
            'account' => $this->account ? [
                'id' => $this->account->id,
                'code' => $this->account->code,
                'name' => $this->account->name,
            ] : null,
            // Derived balance from ledger projection
            'balance' => $balance,
            'current_balance' => $balance,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

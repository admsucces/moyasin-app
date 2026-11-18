<?php

namespace App\Http\Resources;

use App\Models\Payable;
use App\Models\Receivable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DonorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Calculate hutang (Payables)
        $payables = Payable::where('donor_id', $this->id)
            ->orWhere(function ($q) {
                $q->whereNull('donor_id')->where('vendor_name', $this->name);
            })
            ->get();

        $totalPayable = (float) $payables->sum('total_amount');
        $remainingPayable = (float) $payables->sum('remaining_balance');
        $paidPayable = (float) $payables->sum('paid_amount');

        // Calculate piutang (Receivables)
        $receivables = Receivable::where('donor_id', $this->id)
            ->orWhere(function ($q) {
                $q->whereNull('donor_id')->where('customer_name', $this->name);
            })
            ->get();

        $totalReceivable = (float) $receivables->sum('total_amount');
        $remainingReceivable = (float) $receivables->sum('remaining_balance');
        $receivedReceivable = (float) $receivables->sum('received_amount');

        return [
            'id' => $this->id,
            'type' => $this->type ?? 'DONATUR',
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'notes' => $this->notes,
            'is_active' => (bool) $this->is_active,
            'total_payable' => $totalPayable,
            'remaining_payable' => $remainingPayable,
            'paid_payable' => $paidPayable,
            'total_receivable' => $totalReceivable,
            'remaining_receivable' => $remainingReceivable,
            'received_receivable' => $receivedReceivable,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

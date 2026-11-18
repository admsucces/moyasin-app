<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JournalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'journal_no' => $this->journal_no,
            'transaction_id' => $this->transaction_id,
            'transaction' => $this->transaction ? [
                'id' => $this->transaction->id,
                'transaction_no' => $this->transaction->transaction_no,
                'type' => $this->transaction->type,
            ] : null,
            'journal_date' => $this->journal_date?->format('Y-m-d'),
            'accounting_period_id' => $this->accounting_period_id,
            'accounting_period' => $this->accountingPeriod ? [
                'id' => $this->accountingPeriod->id,
                'name' => $this->accountingPeriod->name,
            ] : null,
            'description' => $this->description,
            'status' => $this->status,
            'created_by' => $this->created_by,
            'creator' => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ] : null,
            'posted_by' => $this->posted_by,
            'posted_user' => $this->postedBy ? [
                'id' => $this->postedBy->id,
                'name' => $this->postedBy->name,
            ] : null,
            'posted_at' => $this->posted_at?->toIso8601String(),
            'entries' => JournalEntryResource::collection($this->whenLoaded('entries')),
            'total_debit' => number_format((float) ($this->entries?->sum('debit') ?? 0), 2, '.', ''),
            'total_credit' => number_format((float) ($this->entries?->sum('credit') ?? 0), 2, '.', ''),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

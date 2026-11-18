<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JournalEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'journal_id' => $this->journal_id,
            'account_id' => $this->account_id,
            'account' => $this->account ? [
                'id' => $this->account->id,
                'code' => $this->account->code,
                'name' => $this->account->name,
                'type' => $this->account->type,
                'cash_bank_name' => $this->account->cashBankAccount?->name,
            ] : null,
            'program_id' => $this->program_id,
            'program' => $this->program ? [
                'id' => $this->program->id,
                'code' => $this->program->code,
                'name' => $this->program->name,
            ] : null,
            'description' => $this->description,
            'debit' => number_format((float) $this->debit, 2, '.', ''),
            'credit' => number_format((float) $this->credit, 2, '.', ''),
        ];
    }
}

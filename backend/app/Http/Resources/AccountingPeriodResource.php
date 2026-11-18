<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccountingPeriodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'start_date' => $this->start_date?->format('Y-m-d'),
            'end_date' => $this->end_date?->format('Y-m-d'),
            'status' => $this->status,
            'closed_at' => $this->closed_at?->toIso8601String(),
            'closed_by' => $this->closed_by,
            'closed_user' => $this->closedUser ? [
                'id' => $this->closedUser->id,
                'name' => $this->closedUser->name,
            ] : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

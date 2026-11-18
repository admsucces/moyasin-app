<?php

namespace App\Http\Requests;

use App\Models\AccountingPeriod;
use Illuminate\Foundation\Http\FormRequest;

class CreateAccountingPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && ($this->user()->isAdmin() || $this->user()->isOwner());
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $startDate = $this->start_date;
            $endDate = $this->end_date;

            if ($startDate && $endDate) {
                $overlapExists = AccountingPeriod::where(function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('start_date', [$startDate, $endDate])
                          ->orWhereBetween('end_date', [$startDate, $endDate])
                          ->orWhere(function ($q) use ($startDate, $endDate) {
                              $q->where('start_date', '<=', $startDate)
                                ->where('end_date', '>=', $endDate);
                          });
                })->exists();

                if ($overlapExists) {
                    $validator->errors()->add('start_date', 'Rentang tanggal periode akuntansi bertumpangan (overlapping) dengan periode yang sudah ada.');
                }
            }
        });
    }
}

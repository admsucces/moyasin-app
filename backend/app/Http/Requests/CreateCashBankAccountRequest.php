<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateCashBankAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'account_id' => ['required', 'exists:accounts,id', 'unique:cash_bank_accounts,account_id'],
            'type' => ['required', 'in:CASH,BANK'],
            'name' => ['required', 'string', 'max:150'],
            'bank_name' => ['nullable', 'string', 'max:150'],
            'account_number' => ['nullable', 'string', 'max:100'],
            'account_holder' => ['nullable', 'string', 'max:150'],
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isAdmin();
    }

    public function rules(): array
    {
        $id = $this->route('id');
        return [
            'code' => ['sometimes', 'required', 'string', 'max:30', "unique:accounts,code,{$id}"],
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'type' => ['sometimes', 'required', 'in:ASSET,LIABILITY,EQUITY,INCOME,EXPENSE'],
            'normal_balance' => ['sometimes', 'required', 'in:DEBIT,CREDIT'],
            'parent_id' => ['nullable', 'exists:accounts,id'],
            'is_postable' => ['boolean'],
            'is_active' => ['boolean'],
        ];
    }
}

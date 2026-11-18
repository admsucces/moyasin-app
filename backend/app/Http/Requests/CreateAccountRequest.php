<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:30', 'unique:accounts,code'],
            'name' => ['required', 'string', 'max:150'],
            'type' => ['required', 'in:ASSET,LIABILITY,EQUITY,INCOME,EXPENSE'],
            'normal_balance' => ['required', 'in:DEBIT,CREDIT'],
            'parent_id' => ['nullable', 'exists:accounts,id'],
            'is_postable' => ['boolean'],
            'is_active' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.required' => 'Kode akun wajib diisi.',
            'code.unique' => 'Kode akun sudah terdaftar.',
            'name.required' => 'Nama akun wajib diisi.',
            'type.required' => 'Tipe akun wajib dipilih.',
            'type.in' => 'Tipe akun tidak valid.',
            'normal_balance.required' => 'Saldo normal akun wajib dipilih.',
            'parent_id.exists' => 'Akun induk tidak valid.',
        ];
    }
}

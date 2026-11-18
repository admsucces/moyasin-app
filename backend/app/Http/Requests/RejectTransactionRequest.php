<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RejectTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user && $user->isOwner();
    }

    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'reason.required' => 'Alasan penolakan transaksi wajib diisi.',
        ];
    }
}

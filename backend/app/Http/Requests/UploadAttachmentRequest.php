<?php

namespace App\Http\Requests;

use App\Models\Transaction;
use Illuminate\Foundation\Http\FormRequest;

class UploadAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $id = $this->route('id');
        $transaction = Transaction::find($id);

        if (!$transaction || !$user) {
            return false;
        }

        return $transaction->isEditableBy($user);
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'], // Max 5MB (5120 KB)
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'File bukti transaksi wajib dipilih.',
            'file.mimes' => 'Format file bukti hanya diperbolehkan PDF, JPG, JPEG, atau PNG.',
            'file.max' => 'Ukuran file bukti transaksi maksimal 5 MB.',
        ];
    }
}

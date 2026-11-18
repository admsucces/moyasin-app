<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isAdmin();
    }

    public function rules(): array
    {
        $userId = $this->route('id');
        return [
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'email' => ['sometimes', 'required', 'email', 'max:190', "unique:users,email,{$userId}"],
            'password' => ['nullable', 'string', 'min:6'],
            'role_id' => ['sometimes', 'required', 'exists:roles,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama pengguna wajib diisi.',
            'email.required' => 'Alamat email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Alamat email sudah terdaftar pada pengguna lain.',
            'password.min' => 'Kata sandi minimal 6 karakter.',
            'role_id.required' => 'Role pengguna wajib dipilih.',
            'role_id.exists' => 'Role yang dipilih tidak valid.',
        ];
    }
}

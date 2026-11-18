<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateProgramRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->isAdmin();
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:30', 'unique:programs,code'],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
        ];
    }
}

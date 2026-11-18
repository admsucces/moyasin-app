<?php

namespace App\Http\Requests;

use App\Models\AccountingPeriod;
use Illuminate\Foundation\Http\FormRequest;

class CreateManualJournalRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user && $user->isAdmin();
    }

    public function rules(): array
    {
        return [
            'journal_date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:1000'],
            'entries' => ['required', 'array', 'min:2'],
            'entries.*.account_id' => ['required', 'exists:accounts,id'],
            'entries.*.program_id' => ['nullable', 'exists:programs,id'],
            'entries.*.debit' => ['required', 'numeric', 'gte:0'],
            'entries.*.credit' => ['required', 'numeric', 'gte:0'],
            'entries.*.description' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if ($this->journal_date) {
                $openPeriod = AccountingPeriod::where('status', 'OPEN')
                    ->where('start_date', '<=', $this->journal_date)
                    ->where('end_date', '>=', $this->journal_date)
                    ->first();

                if (!$openPeriod) {
                    $validator->errors()->add('journal_date', 'Tanggal jurnal tidak berada pada periode akuntansi berstatus OPEN.');
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'journal_date.required' => 'Tanggal jurnal wajib diisi.',
            'description.required' => 'Keterangan jurnal wajib diisi.',
            'entries.required' => 'Rincian entri jurnal wajib diisi.',
            'entries.min' => 'Jurnal umum minimal harus terdiri dari 2 entri berpasangan (debit & kredit).',
        ];
    }
}

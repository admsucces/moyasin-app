<?php

namespace App\Http\Requests;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\CashBankAccount;
use App\Models\Program;
use Illuminate\Foundation\Http\FormRequest;

class CreateIncomeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user && ($user->isAdmin() || $user->isPengelola());
    }

    public function rules(): array
    {
        return [
            'transaction_date' => ['required', 'date'],
            'cash_bank_account_id' => ['required', 'exists:cash_bank_accounts,id'],
            'income_account_id' => ['required', 'exists:accounts,id'],
            'donor_id' => ['nullable', 'exists:donors,id'],
            'program_id' => ['nullable', 'exists:programs,id'],
            'restriction_type' => ['required', 'in:WITH_RESTRICTION,WITHOUT_RESTRICTION'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'description' => ['required', 'string'],
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // 1. Period check: transaction_date must fall inside an OPEN period
            if ($this->transaction_date) {
                $openPeriod = AccountingPeriod::where('status', 'OPEN')
                    ->where('start_date', '<=', $this->transaction_date)
                    ->where('end_date', '>=', $this->transaction_date)
                    ->first();

                if (!$openPeriod) {
                    $validator->errors()->add('transaction_date', 'Tanggal transaksi tidak berada pada periode akuntansi berstatus OPEN.');
                }
            }

            // 2. Cash / Bank active check
            if ($this->cash_bank_account_id) {
                $cashBank = CashBankAccount::find($this->cash_bank_account_id);
                if ($cashBank && !$cashBank->is_active) {
                    $validator->errors()->add('cash_bank_account_id', 'Akun Kas/Bank yang dipilih sedang nonaktif.');
                }
            }

            // 3. Income Account check (must be active & is_postable = true)
            if ($this->income_account_id) {
                $incomeAccount = Account::find($this->income_account_id);
                if ($incomeAccount) {
                    if (!$incomeAccount->is_active) {
                        $validator->errors()->add('income_account_id', 'Akun Penerimaan yang dipilih sedang nonaktif.');
                    }
                    if (!$incomeAccount->is_postable) {
                        $validator->errors()->add('income_account_id', 'Akun Penerimaan yang dipilih adalah akun Header/Group dan tidak dapat menerima posting jurnal.');
                    }
                }
            }

            // 4. Program active check (if provided)
            if ($this->program_id) {
                $program = Program::find($this->program_id);
                if ($program && !$program->is_active) {
                    $validator->errors()->add('program_id', 'Program yang dipilih sedang nonaktif.');
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'transaction_date.required' => 'Tanggal transaksi wajib diisi.',
            'cash_bank_account_id.required' => 'Akun Kas/Bank wajib dipilih.',
            'income_account_id.required' => 'Akun Penerimaan wajib dipilih.',
            'restriction_type.required' => 'Klasifikasi pembatasan dana wajib dipilih.',
            'amount.required' => 'Nominal transaksi wajib diisi.',
            'amount.gt' => 'Nominal transaksi wajib lebih besar dari 0.',
            'description.required' => 'Keterangan transaksi wajib diisi.',
        ];
    }
}

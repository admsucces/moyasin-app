<?php

namespace App\Http\Requests;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\CashBankAccount;
use App\Models\Program;
use App\Models\Transaction;
use Illuminate\Foundation\Http\FormRequest;

class UpdateIncomeRequest extends FormRequest
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
            'transaction_date' => ['sometimes', 'required', 'date'],
            'cash_bank_account_id' => ['sometimes', 'required', 'exists:cash_bank_accounts,id'],
            'income_account_id' => ['sometimes', 'required', 'exists:accounts,id'],
            'donor_id' => ['nullable', 'exists:donors,id'],
            'program_id' => ['nullable', 'exists:programs,id'],
            'restriction_type' => ['sometimes', 'required', 'in:WITH_RESTRICTION,WITHOUT_RESTRICTION'],
            'amount' => ['sometimes', 'required', 'numeric', 'gt:0'],
            'description' => ['sometimes', 'required', 'string'],
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if ($this->transaction_date) {
                $openPeriod = AccountingPeriod::where('status', 'OPEN')
                    ->where('start_date', '<=', $this->transaction_date)
                    ->where('end_date', '>=', $this->transaction_date)
                    ->first();

                if (!$openPeriod) {
                    $validator->errors()->add('transaction_date', 'Tanggal transaksi tidak berada pada periode akuntansi berstatus OPEN.');
                }
            }
        });
    }
}

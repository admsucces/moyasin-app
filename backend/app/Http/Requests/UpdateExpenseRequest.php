<?php

namespace App\Http\Requests;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\CashBankAccount;
use App\Models\Program;
use App\Models\Transaction;
use Illuminate\Foundation\Http\FormRequest;

class UpdateExpenseRequest extends FormRequest
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
            'expense_account_id' => ['sometimes', 'required', 'exists:accounts,id'],
            'counterparty_name' => ['sometimes', 'required', 'string', 'max:200'],
            'program_id' => ['nullable', 'exists:programs,id'],
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

            if ($this->cash_bank_account_id) {
                $cashBank = CashBankAccount::find($this->cash_bank_account_id);
                if ($cashBank && !$cashBank->is_active) {
                    $validator->errors()->add('cash_bank_account_id', 'Akun Kas/Bank yang dipilih sedang nonaktif.');
                }
            }

            if ($this->expense_account_id) {
                $expenseAccount = Account::find($this->expense_account_id);
                if ($expenseAccount) {
                    if ($expenseAccount->type !== 'EXPENSE') {
                        $validator->errors()->add('expense_account_id', 'Akun Pengeluaran yang dipilih harus bertipe Beban/Pengeluaran (EXPENSE).');
                    }
                    if (!$expenseAccount->is_active) {
                        $validator->errors()->add('expense_account_id', 'Akun Pengeluaran yang dipilih sedang nonaktif.');
                    }
                    if (!$expenseAccount->is_postable) {
                        $validator->errors()->add('expense_account_id', 'Akun Pengeluaran yang dipilih adalah akun Header/Group dan tidak dapat menerima posting jurnal.');
                    }
                }
            }

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
            'expense_account_id.required' => 'Akun Pengeluaran wajib dipilih.',
            'counterparty_name.required' => 'Nama penerima / pihak ketiga wajib diisi.',
            'amount.required' => 'Nominal pengeluaran wajib diisi.',
            'amount.gt' => 'Nominal pengeluaran wajib lebih besar dari 0.',
            'description.required' => 'Keterangan pengeluaran wajib diisi.',
        ];
    }
}

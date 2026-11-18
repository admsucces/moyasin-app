<?php

namespace App\Http\Requests;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\CashBankAccount;
use App\Models\Program;
use Illuminate\Foundation\Http\FormRequest;

class CreateExpenseRequest extends FormRequest
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
            'expense_account_id' => ['required', 'exists:accounts,id'],
            'counterparty_name' => ['required', 'string', 'max:200'],
            'program_id' => ['nullable', 'exists:programs,id'],
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

            // 3. Expense Account check (must be active, type = EXPENSE, is_postable = true)
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
            'expense_account_id.required' => 'Akun Pengeluaran wajib dipilih.',
            'counterparty_name.required' => 'Nama penerima / pihak ketiga wajib diisi.',
            'amount.required' => 'Nominal pengeluaran wajib diisi.',
            'amount.gt' => 'Nominal pengeluaran wajib lebih besar dari 0.',
            'description.required' => 'Keterangan pengeluaran wajib diisi.',
        ];
    }
}

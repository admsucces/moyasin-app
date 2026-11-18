<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DebtPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_no',
        'type',
        'payable_id',
        'receivable_id',
        'payment_date',
        'amount',
        'cash_bank_account_id',
        'journal_id',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'payment_date' => 'date:Y-m-d',
        'amount' => 'decimal:2',
    ];

    public function payable()
    {
        return $this->belongsTo(Payable::class);
    }

    public function receivable()
    {
        return $this->belongsTo(Receivable::class);
    }

    public function cashBankAccount()
    {
        return $this->belongsTo(CashBankAccount::class);
    }

    public function journal()
    {
        return $this->belongsTo(Journal::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

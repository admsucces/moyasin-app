<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Receivable extends Model
{
    use HasFactory;

    protected $fillable = [
        'receivable_no',
        'invoice_no',
        'donor_id',
        'customer_name',
        'transaction_date',
        'due_date',
        'total_amount',
        'received_amount',
        'remaining_balance',
        'status',
        'receivable_account_id',
        'income_account_id',
        'journal_id',
        'description',
    ];

    protected $casts = [
        'transaction_date' => 'date:Y-m-d',
        'due_date' => 'date:Y-m-d',
        'total_amount' => 'decimal:2',
        'received_amount' => 'decimal:2',
        'remaining_balance' => 'decimal:2',
    ];

    public function donor()
    {
        return $this->belongsTo(Donor::class, 'donor_id');
    }

    public function receivableAccount()
    {
        return $this->belongsTo(Account::class, 'receivable_account_id');
    }

    public function incomeAccount()
    {
        return $this->belongsTo(Account::class, 'income_account_id');
    }

    public function journal()
    {
        return $this->belongsTo(Journal::class, 'journal_id');
    }

    public function payments()
    {
        return $this->hasMany(DebtPayment::class, 'receivable_id');
    }
}

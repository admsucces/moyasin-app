<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payable extends Model
{
    use HasFactory;

    protected $fillable = [
        'payable_no',
        'invoice_no',
        'donor_id',
        'vendor_name',
        'transaction_date',
        'due_date',
        'total_amount',
        'paid_amount',
        'remaining_balance',
        'status',
        'payable_account_id',
        'expense_asset_account_id',
        'journal_id',
        'description',
    ];

    protected $casts = [
        'transaction_date' => 'date:Y-m-d',
        'due_date' => 'date:Y-m-d',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'remaining_balance' => 'decimal:2',
    ];

    public function donor()
    {
        return $this->belongsTo(Donor::class, 'donor_id');
    }

    public function payableAccount()
    {
        return $this->belongsTo(Account::class, 'payable_account_id');
    }

    public function expenseAssetAccount()
    {
        return $this->belongsTo(Account::class, 'expense_asset_account_id');
    }

    public function journal()
    {
        return $this->belongsTo(Journal::class, 'journal_id');
    }

    public function payments()
    {
        return $this->hasMany(DebtPayment::class, 'payable_id');
    }
}

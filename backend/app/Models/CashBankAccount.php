<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashBankAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_id',
        'type',
        'name',
        'bank_name',
        'account_number',
        'account_holder',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function account()
    {
        return $this->belongsTo(Account::class);
    }
}

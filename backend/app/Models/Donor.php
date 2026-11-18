<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Donor extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'name',
        'phone',
        'email',
        'address',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function payables()
    {
        return $this->hasMany(Payable::class, 'donor_id');
    }

    public function receivables()
    {
        return $this->hasMany(Receivable::class, 'donor_id');
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class, 'donor_id');
    }
}

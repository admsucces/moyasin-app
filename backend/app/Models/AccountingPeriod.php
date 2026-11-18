<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AccountingPeriod extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'status',
        'closed_at',
        'closed_by',
        'reopen_reason',
        'reopened_at',
        'reopened_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'closed_at' => 'datetime',
        'reopened_at' => 'datetime',
    ];

    public function closedUser()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function reopenedUser()
    {
        return $this->belongsTo(User::class, 'reopened_by');
    }

    public function isOpen(): bool
    {
        return $this->status === 'OPEN';
    }

    public function isClosed(): bool
    {
        return $this->status === 'CLOSED';
    }

    public function isClosingRequested(): bool
    {
        return $this->status === 'CLOSING_REQUESTED';
    }

    public function isReopenRequested(): bool
    {
        return $this->status === 'REOPEN_REQUESTED';
    }
}

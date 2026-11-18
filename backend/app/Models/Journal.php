<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Journal extends Model
{
    use HasFactory;

    protected $fillable = [
        'journal_no',
        'transaction_id',
        'journal_date',
        'accounting_period_id',
        'description',
        'status',
        'is_reversal',
        'reversed_journal_id',
        'created_by',
        'posted_by',
        'posted_at',
    ];

    protected $casts = [
        'journal_date' => 'date',
        'posted_at' => 'datetime',
        'is_reversal' => 'boolean',
    ];

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function reversedJournal()
    {
        return $this->belongsTo(Journal::class, 'reversed_journal_id');
    }

    public function accountingPeriod()
    {
        return $this->belongsTo(AccountingPeriod::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function postedBy()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function entries()
    {
        return $this->hasMany(JournalEntry::class);
    }

    public function receivable()
    {
        return $this->hasOne(Receivable::class);
    }

    public function payable()
    {
        return $this->hasOne(Payable::class);
    }

    public function isPosted(): bool
    {
        return $this->status === 'POSTED';
    }
}

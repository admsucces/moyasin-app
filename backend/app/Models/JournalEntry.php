<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JournalEntry extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'journal_id',
        'account_id',
        'program_id',
        'description',
        'debit',
        'credit',
        'created_at',
    ];

    protected $casts = [
        'debit' => 'decimal:2',
        'credit' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function journal()
    {
        return $this->belongsTo(Journal::class);
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function program()
    {
        return $this->belongsTo(Program::class);
    }
}

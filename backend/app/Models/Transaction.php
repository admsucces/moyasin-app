<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_no',
        'type',
        'transaction_date',
        'accounting_period_id',
        'program_id',
        'donor_id',
        'cash_bank_account_id',
        'income_account_id',
        'expense_account_id',
        'counterparty_name',
        'restriction_type',
        'amount',
        'description',
        'status',
        'reversal_reason',
        'reversed_at',
        'reversed_by',
        'created_by',
        'submitted_at',
        'approved_at',
        'posted_at',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'amount' => 'decimal:2',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'posted_at' => 'datetime',
        'reversed_at' => 'datetime',
    ];

    public function accountingPeriod()
    {
        return $this->belongsTo(AccountingPeriod::class);
    }

    public function program()
    {
        return $this->belongsTo(Program::class);
    }

    public function donor()
    {
        return $this->belongsTo(Donor::class);
    }

    public function cashBankAccount()
    {
        return $this->belongsTo(CashBankAccount::class);
    }

    public function incomeAccount()
    {
        return $this->belongsTo(Account::class, 'income_account_id');
    }

    public function expenseAccount()
    {
        return $this->belongsTo(Account::class, 'expense_account_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reversedUser()
    {
        return $this->belongsTo(User::class, 'reversed_by');
    }

    public function attachments()
    {
        return $this->hasMany(TransactionAttachment::class);
    }

    public function approvals()
    {
        return $this->hasMany(Approval::class)->orderBy('id', 'desc');
    }

    public function journal()
    {
        return $this->hasOne(Journal::class);
    }

    public function isDraft(): bool
    {
        return $this->status === 'DRAFT';
    }

    public function isSubmitted(): bool
    {
        return $this->status === 'SUBMITTED';
    }

    public function isApproved(): bool
    {
        return $this->status === 'APPROVED';
    }

    public function isRejected(): bool
    {
        return $this->status === 'REJECTED';
    }

    public function isPosted(): bool
    {
        return $this->status === 'POSTED';
    }

    public function isReversed(): bool
    {
        return $this->status === 'REVERSED';
    }

    public function isEditableBy(User $user): bool
    {
        if ($this->isPosted() || $this->isReversed()) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return ($this->isDraft() || $this->isRejected()) && (int)$this->created_by === (int)$user->id;
    }
}

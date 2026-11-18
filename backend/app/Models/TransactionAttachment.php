<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransactionAttachment extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'transaction_id',
        'original_name',
        'storage_path',
        'mime_type',
        'size_bytes',
        'uploaded_by',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

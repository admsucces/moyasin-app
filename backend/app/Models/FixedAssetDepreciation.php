<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FixedAssetDepreciation extends Model
{
    use HasFactory;

    protected $fillable = [
        'fixed_asset_id',
        'journal_id',
        'year',
        'month',
        'amount',
        'depreciation_date',
    ];

    protected $casts = [
        'year' => 'integer',
        'month' => 'integer',
        'amount' => 'decimal:2',
        'depreciation_date' => 'date:Y-m-d',
    ];

    public function fixedAsset()
    {
        return $this->belongsTo(FixedAsset::class);
    }

    public function journal()
    {
        return $this->belongsTo(Journal::class);
    }
}

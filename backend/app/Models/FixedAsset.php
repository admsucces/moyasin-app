<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FixedAsset extends Model
{
    use HasFactory;

    protected $fillable = [
        'asset_code',
        'name',
        'acquisition_date',
        'acquisition_cost',
        'useful_life_years',
        'salvage_value',
        'depreciation_method',
        'asset_account_id',
        'accumulated_depr_account_id',
        'depreciation_expense_account_id',
        'status',
        'description',
    ];

    protected $casts = [
        'acquisition_date' => 'date:Y-m-d',
        'acquisition_cost' => 'decimal:2',
        'useful_life_years' => 'integer',
        'salvage_value' => 'decimal:2',
    ];

    protected $appends = [
        'monthly_depreciation',
        'total_accumulated_depreciation',
        'book_value',
    ];

    public function assetAccount()
    {
        return $this->belongsTo(Account::class, 'asset_account_id');
    }

    public function accumulatedDeprAccount()
    {
        return $this->belongsTo(Account::class, 'accumulated_depr_account_id');
    }

    public function depreciationExpenseAccount()
    {
        return $this->belongsTo(Account::class, 'depreciation_expense_account_id');
    }

    public function depreciations()
    {
        return $this->hasMany(FixedAssetDepreciation::class);
    }

    public function getMonthlyDepreciationAttribute()
    {
        if ($this->depreciation_method === 'NONE' || $this->useful_life_years <= 0) {
            return 0;
        }

        $depreciableAmount = max(0, (float) $this->acquisition_cost - (float) $this->salvage_value);
        $totalMonths = $this->useful_life_years * 12;

        return round($depreciableAmount / $totalMonths, 2);
    }

    public function getTotalAccumulatedDepreciationAttribute()
    {
        return (float) $this->depreciations()->sum('amount');
    }

    public function getBookValueAttribute()
    {
        return max(0, (float) $this->acquisition_cost - $this->total_accumulated_depreciation);
    }
}

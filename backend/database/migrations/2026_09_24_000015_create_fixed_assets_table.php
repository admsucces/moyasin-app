<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fixed_assets', function (Blueprint $table) {
            $table->id();
            $table->string('asset_code', 50)->unique();
            $table->string('name', 150);
            $table->date('acquisition_date');
            $table->decimal('acquisition_cost', 15, 2);
            $table->integer('useful_life_years')->default(5);
            $table->decimal('salvage_value', 15, 2)->default(0);
            $table->string('depreciation_method', 30)->default('STRAIGHT_LINE'); // STRAIGHT_LINE, NONE
            $table->foreignId('asset_account_id')->constrained('accounts')->onDelete('restrict');
            $table->foreignId('accumulated_depr_account_id')->nullable()->constrained('accounts')->onDelete('restrict');
            $table->foreignId('depreciation_expense_account_id')->nullable()->constrained('accounts')->onDelete('restrict');
            $table->string('status', 20)->default('ACTIVE'); // ACTIVE, DISPOSED
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('fixed_asset_depreciations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixed_asset_id')->constrained('fixed_assets')->onDelete('cascade');
            $table->foreignId('journal_id')->nullable()->constrained('journals')->onDelete('set null');
            $table->integer('year');
            $table->integer('month');
            $table->decimal('amount', 15, 2);
            $table->date('depreciation_date');
            $table->timestamps();

            $table->unique(['fixed_asset_id', 'year', 'month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fixed_asset_depreciations');
        Schema::dropIfExists('fixed_assets');
    }
};

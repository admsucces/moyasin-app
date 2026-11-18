<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payables', function (Blueprint $table) {
            $table->foreignId('expense_asset_account_id')->nullable()->after('payable_account_id')->constrained('accounts')->onDelete('restrict');
            $table->foreignId('journal_id')->nullable()->after('expense_asset_account_id')->constrained('journals')->onDelete('set null');
        });

        Schema::table('receivables', function (Blueprint $table) {
            $table->foreignId('income_account_id')->nullable()->after('receivable_account_id')->constrained('accounts')->onDelete('restrict');
            $table->foreignId('journal_id')->nullable()->after('income_account_id')->constrained('journals')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('receivables', function (Blueprint $table) {
            $table->dropForeign(['journal_id']);
            $table->dropForeign(['income_account_id']);
            $table->dropColumn(['journal_id', 'income_account_id']);
        });

        Schema::table('payables', function (Blueprint $table) {
            $table->dropForeign(['journal_id']);
            $table->dropForeign(['expense_asset_account_id']);
            $table->dropColumn(['journal_id', 'expense_asset_account_id']);
        });
    }
};

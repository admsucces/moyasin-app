<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->text('reversal_reason')->nullable()->after('status');
            $table->timestamp('reversed_at')->nullable()->after('reversal_reason');
            $table->foreignId('reversed_by')->nullable()->after('reversed_at')->constrained('users')->onDelete('restrict');
        });

        Schema::table('journals', function (Blueprint $table) {
            $table->boolean('is_reversal')->default(false)->after('status');
            $table->foreignId('reversed_journal_id')->nullable()->after('is_reversal')->constrained('journals')->onDelete('restrict');
        });

        Schema::table('accounting_periods', function (Blueprint $table) {
            $table->text('reopen_reason')->nullable()->after('closed_by');
            $table->timestamp('reopened_at')->nullable()->after('reopen_reason');
            $table->foreignId('reopened_by')->nullable()->after('reopened_at')->constrained('users')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['reversed_by']);
            $table->dropColumn(['reversal_reason', 'reversed_at', 'reversed_by']);
        });

        Schema::table('journals', function (Blueprint $table) {
            $table->dropForeign(['reversed_journal_id']);
            $table->dropColumn(['is_reversal', 'reversed_journal_id']);
        });

        Schema::table('accounting_periods', function (Blueprint $table) {
            $table->dropForeign(['reopened_by']);
            $table->dropColumn(['reopen_reason', 'reopened_at', 'reopened_by']);
        });
    }
};

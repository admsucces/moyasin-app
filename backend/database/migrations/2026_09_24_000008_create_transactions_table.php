<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_no', 50)->unique();
            $table->string('type', 30); // INCOME, EXPENSE, MANUAL_JOURNAL, ADJUSTMENT
            $table->date('transaction_date');
            $table->foreignId('accounting_period_id')->constrained('accounting_periods')->onDelete('restrict');
            $table->foreignId('program_id')->nullable()->constrained('programs')->onDelete('restrict');
            $table->foreignId('donor_id')->nullable()->constrained('donors')->onDelete('restrict');
            $table->foreignId('cash_bank_account_id')->nullable()->constrained('cash_bank_accounts')->onDelete('restrict');
            $table->foreignId('income_account_id')->nullable()->constrained('accounts')->onDelete('restrict');
            $table->foreignId('expense_account_id')->nullable()->constrained('accounts')->onDelete('restrict');
            $table->string('counterparty_name', 200)->nullable();
            $table->string('restriction_type', 30)->nullable(); // WITH_RESTRICTION, WITHOUT_RESTRICTION
            $table->decimal('amount', 19, 2);
            $table->text('description');
            $table->string('status', 30)->default('DRAFT'); // DRAFT, SUBMITTED, REJECTED, APPROVED, POSTED, REVERSED
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();

            // Indexes for fast lookup & filtering
            $table->index('transaction_date');
            $table->index('status');
            $table->index(['type', 'transaction_date']);
            $table->index(['program_id', 'transaction_date']);
            $table->index(['accounting_period_id', 'status']);
            $table->index(['created_by', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};

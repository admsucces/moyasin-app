<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journals', function (Blueprint $table) {
            $table->id();
            $table->string('journal_no', 50)->unique();
            $table->foreignId('transaction_id')->nullable()->unique()->constrained('transactions')->onDelete('restrict');
            $table->date('journal_date');
            $table->foreignId('accounting_period_id')->constrained('accounting_periods')->onDelete('restrict');
            $table->text('description');
            $table->string('status', 20)->default('POSTED'); // DRAFT, POSTED, REVERSED
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->foreignId('posted_by')->nullable()->constrained('users')->onDelete('restrict');
            $table->timestamp('posted_at')->nullable();
            $table->timestamps();

            $table->index('journal_date');
            $table->index('status');
            $table->index(['accounting_period_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journals');
    }
};

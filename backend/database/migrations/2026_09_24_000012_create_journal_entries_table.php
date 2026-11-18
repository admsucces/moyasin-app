<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_id')->constrained('journals')->onDelete('cascade');
            $table->foreignId('account_id')->constrained('accounts')->onDelete('restrict');
            $table->foreignId('program_id')->nullable()->constrained('programs')->onDelete('restrict');
            $table->string('description', 500)->nullable();
            $table->decimal('debit', 19, 2)->default(0.00);
            $table->decimal('credit', 19, 2)->default(0.00);
            $table->timestamp('created_at')->useCurrent();

            $table->index('journal_id');
            $table->index('account_id');
            $table->index(['account_id', 'journal_id']);
            $table->index('program_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journal_entries');
    }
};

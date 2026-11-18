<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('accounts')->onDelete('restrict');
            $table->string('code', 30)->unique();
            $table->string('name', 150);
            $table->string('type', 30); // ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
            $table->string('normal_balance', 10); // DEBIT, CREDIT
            $table->boolean('is_postable')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};

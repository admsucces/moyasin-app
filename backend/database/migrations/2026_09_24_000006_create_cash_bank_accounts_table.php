<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->unique()->constrained('accounts')->onDelete('restrict');
            $table->string('type', 20); // CASH, BANK
            $table->string('name', 150);
            $table->string('bank_name', 150)->nullable();
            $table->string('account_number', 100)->nullable();
            $table->string('account_holder', 150)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_bank_accounts');
    }
};

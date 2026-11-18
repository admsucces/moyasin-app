<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounting_periods', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status', 20)->default('OPEN'); // OPEN, CLOSING_REQUESTED, CLOSED, REOPEN_REQUESTED
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->onDelete('restrict');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_periods');
    }
};

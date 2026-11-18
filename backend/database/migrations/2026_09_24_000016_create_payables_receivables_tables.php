<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add type column to donors table if not exists (for Rekanan classification: DONATUR, VENDOR, LAINNYA)
        if (Schema::hasTable('donors') && !Schema::hasColumn('donors', 'type')) {
            Schema::table('donors', function (Blueprint $table) {
                $table->string('type', 30)->default('DONATUR')->after('id');
            });
        }

        // Tabel Hutang (Accounts Payable / AP)
        Schema::create('payables', function (Blueprint $table) {
            $table->id();
            $table->string('payable_no', 50)->unique();
            $table->string('invoice_no', 100)->nullable();
            $table->foreignId('donor_id')->nullable()->constrained('donors')->onDelete('restrict'); // Rekanan/Vendor
            $table->string('vendor_name', 150);
            $table->date('transaction_date');
            $table->date('due_date');
            $table->decimal('total_amount', 15, 2);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('remaining_balance', 15, 2);
            $table->string('status', 20)->default('UNPAID'); // UNPAID, PARTIAL, PAID
            $table->foreignId('payable_account_id')->constrained('accounts')->onDelete('restrict'); // Akun Utang (2101)
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Tabel Piutang (Accounts Receivable / AR)
        Schema::create('receivables', function (Blueprint $table) {
            $table->id();
            $table->string('receivable_no', 50)->unique();
            $table->string('invoice_no', 100)->nullable();
            $table->foreignId('donor_id')->nullable()->constrained('donors')->onDelete('restrict'); // Rekanan/Donatur
            $table->string('customer_name', 150);
            $table->date('transaction_date');
            $table->date('due_date');
            $table->decimal('total_amount', 15, 2);
            $table->decimal('received_amount', 15, 2)->default(0);
            $table->decimal('remaining_balance', 15, 2);
            $table->string('status', 20)->default('UNPAID'); // UNPAID, PARTIAL, PAID
            $table->foreignId('receivable_account_id')->constrained('accounts')->onDelete('restrict'); // Akun Piutang (1104)
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Riwayat Pelunasan Hutang & Piutang
        Schema::create('debt_payments', function (Blueprint $table) {
            $table->id();
            $table->string('payment_no', 50)->unique();
            $table->string('type', 20); // PAYABLE_PAYMENT, RECEIVABLE_PAYMENT
            $table->foreignId('payable_id')->nullable()->constrained('payables')->onDelete('cascade');
            $table->foreignId('receivable_id')->nullable()->constrained('receivables')->onDelete('cascade');
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->foreignId('cash_bank_account_id')->constrained('cash_bank_accounts')->onDelete('restrict');
            $table->foreignId('journal_id')->nullable()->constrained('journals')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('debt_payments');
        Schema::dropIfExists('receivables');
        Schema::dropIfExists('payables');

        if (Schema::hasTable('donors') && Schema::hasColumn('donors', 'type')) {
            Schema::table('donors', function (Blueprint $table) {
                $table->dropColumn('type');
            });
        }
    }
};

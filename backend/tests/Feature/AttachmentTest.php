<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountingPeriod;
use App\Models\CashBankAccount;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AttachmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        Storage::fake('local');
    }

    public function test_authorized_user_can_upload_attachment_to_draft_transaction(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();
        $period = AccountingPeriod::where('status', 'OPEN')->first();

        $transaction = Transaction::create([
            'transaction_no' => 'TRX-2026-000200',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-15',
            'accounting_period_id' => $period->id,
            'cash_bank_account_id' => $cashBank->id,
            'income_account_id' => $incomeAccount->id,
            'amount' => 1500000,
            'description' => 'Donasi Bukti Transfer',
            'status' => 'DRAFT',
            'created_by' => $pengelola->id,
        ]);

        $file = UploadedFile::fake()->create('bukti_transfer.pdf', 500, 'application/pdf');

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->postJson("/api/v1/transactions/{$transaction->id}/attachments", [
                             'file' => $file,
                         ]);

        $response->assertStatus(201)
                 ->assertJson([
                     'success' => true,
                     'message' => 'Bukti transaksi berhasil diunggah.',
                     'data' => [
                         'original_name' => 'bukti_transfer.pdf',
                     ],
                 ]);

        $this->assertDatabaseHas('transaction_attachments', [
            'transaction_id' => $transaction->id,
            'original_name' => 'bukti_transfer.pdf',
        ]);
    }

    public function test_attachment_upload_validates_file_extension(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();
        $period = AccountingPeriod::where('status', 'OPEN')->first();

        $transaction = Transaction::create([
            'transaction_no' => 'TRX-2026-000201',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-15',
            'accounting_period_id' => $period->id,
            'cash_bank_account_id' => $cashBank->id,
            'income_account_id' => $incomeAccount->id,
            'amount' => 1000000,
            'description' => 'Donasi Lampiran Test',
            'status' => 'DRAFT',
            'created_by' => $pengelola->id,
        ]);

        $file = UploadedFile::fake()->create('malicious.exe', 100, 'application/x-msdownload');

        $response = $this->actingAs($pengelola, 'sanctum')
                         ->postJson("/api/v1/transactions/{$transaction->id}/attachments", [
                             'file' => $file,
                         ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['file']);
    }

    public function test_authenticated_user_can_download_attachment(): void
    {
        $pengelola = User::where('email', 'pengelola@yayasan.org')->first();
        $cashBank = CashBankAccount::first();
        $incomeAccount = Account::where('type', 'INCOME')->where('is_postable', true)->first();
        $period = AccountingPeriod::where('status', 'OPEN')->first();

        $transaction = Transaction::create([
            'transaction_no' => 'TRX-2026-000202',
            'type' => 'INCOME',
            'transaction_date' => '2026-09-15',
            'accounting_period_id' => $period->id,
            'cash_bank_account_id' => $cashBank->id,
            'income_account_id' => $incomeAccount->id,
            'amount' => 1000000,
            'description' => 'Donasi Bukti Gambar',
            'status' => 'DRAFT',
            'created_by' => $pengelola->id,
        ]);

        $file = UploadedFile::fake()->create('kwitansi.png', 200, 'image/png');

        $uploadResponse = $this->actingAs($pengelola, 'sanctum')
                               ->postJson("/api/v1/transactions/{$transaction->id}/attachments", [
                                   'file' => $file,
                               ]);

        $attachmentId = $uploadResponse->json('data.id');

        $downloadResponse = $this->actingAs($pengelola, 'sanctum')
                                 ->get("/api/v1/transactions/{$transaction->id}/attachments/{$attachmentId}");

        $downloadResponse->assertStatus(200);
    }
}

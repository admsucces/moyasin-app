<?php

use App\Http\Controllers\Api\V1\AccountController;
use App\Http\Controllers\Api\V1\AccountingPeriodController;
use App\Http\Controllers\Api\V1\ApprovalController;
use App\Http\Controllers\Api\V1\AttachmentController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\CashBankAccountController;
use App\Http\Controllers\Api\V1\DonorController;
use App\Http\Controllers\Api\V1\DebtPaymentController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\ExportController;
use App\Http\Controllers\Api\V1\FinancialReportController;
use App\Http\Controllers\Api\V1\FixedAssetController;
use App\Http\Controllers\Api\V1\InitialBalanceController;
use App\Http\Controllers\Api\V1\JournalController;
use App\Http\Controllers\Api\V1\LedgerController;
use App\Http\Controllers\Api\V1\ManagementReportController;
use App\Http\Controllers\Api\V1\PayableController;
use App\Http\Controllers\Api\V1\PostingController;
use App\Http\Controllers\Api\V1\ProgramController;
use App\Http\Controllers\Api\V1\ReceivableController;
use App\Http\Controllers\Api\V1\ReversalController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\TransactionController;
use App\Http\Controllers\Api\V1\TrialBalanceController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public Auth & Settings Routes
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::get('/settings', [SettingController::class, 'index']);

    // Authenticated Routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // --- MASTER DATA READ (ALL AUTHENTICATED ROLES) ---
        Route::get('/accounts', [AccountController::class, 'index']);
        Route::get('/programs', [ProgramController::class, 'index']);
        Route::get('/donors', [DonorController::class, 'index']);
        Route::get('/cash-bank-accounts', [CashBankAccountController::class, 'index']);
        Route::get('/accounting-periods', [AccountingPeriodController::class, 'index']);

        // --- TRANSACTIONS READ & DOWNLOAD ATTACHMENT (ALL AUTHENTICATED ROLES) ---
        Route::get('/transactions', [TransactionController::class, 'index']);
        Route::get('/transactions/{id}', [TransactionController::class, 'show']);
        Route::get('/transactions/{id}/attachments/{attachmentId}', [AttachmentController::class, 'download']);

        // --- JOURNALS, LEDGER & TRIAL BALANCE READ (ALL AUTHENTICATED ROLES) ---
        Route::get('/journals', [JournalController::class, 'index']);
        Route::get('/journals/{id}', [JournalController::class, 'show']);
        Route::get('/accounting/ledger', [LedgerController::class, 'index']);
        Route::get('/accounting/sub-ledger', [LedgerController::class, 'subLedger']);
        Route::get('/accounting/trial-balance', [TrialBalanceController::class, 'index']);
        Route::get('/accounting/post-closing-trial-balance', [TrialBalanceController::class, 'postClosing']);
        Route::get('/initial-balances', [InitialBalanceController::class, 'index']);
        Route::get('/fixed-assets', [FixedAssetController::class, 'index']);
        Route::get('/fixed-assets/{id}', [FixedAssetController::class, 'show']);

        // --- PAYABLES & RECEIVABLES READ (ALL AUTHENTICATED ROLES) ---
        Route::get('/payables', [PayableController::class, 'index']);
        Route::get('/payables/{id}', [PayableController::class, 'show']);
        Route::get('/receivables', [ReceivableController::class, 'index']);
        Route::get('/receivables/{id}', [ReceivableController::class, 'show']);

        // --- FINANCIAL & MANAGEMENT REPORTS (ALL AUTHENTICATED ROLES) ---
        Route::get('/reports/balance-sheet', [FinancialReportController::class, 'balanceSheet']);
        Route::get('/reports/income-statement', [FinancialReportController::class, 'incomeStatement']);
        Route::get('/reports/changes-in-net-assets', [FinancialReportController::class, 'changesInNetAssets']);
        Route::get('/reports/cash-flows', [FinancialReportController::class, 'cashFlows']);
        Route::get('/reports/post-closing-trial-balance', [TrialBalanceController::class, 'postClosing']);
        Route::get('/reports/management', [ManagementReportController::class, 'summary']);

        // --- EXPORT DATA & REPORTS (ALL AUTHENTICATED ROLES) ---
        Route::get('/export/transactions', [ExportController::class, 'transactions']);
        Route::get('/export/journals', [ExportController::class, 'journals']);
        Route::get('/export/reports/trial-balance', [ExportController::class, 'trialBalance']);

        // --- AUDIT LOGS & APP SETTINGS (ADMIN & OWNER ONLY) ---
        Route::middleware('role:ADMIN,OWNER')->group(function () {
            Route::get('/audit-logs', [AuditLogController::class, 'index']);
            Route::put('/settings', [SettingController::class, 'update']);
            Route::post('/settings', [SettingController::class, 'update']);
        });

        // --- TRANSACTION CREATION & MUTATION (ADMIN & PENGELOLA) ---
        Route::middleware('role:ADMIN,PENGELOLA')->group(function () {
            Route::post('/transactions/income', [TransactionController::class, 'storeIncome']);
            Route::put('/transactions/income/{id}', [TransactionController::class, 'update']);
            Route::post('/transactions/expense', [TransactionController::class, 'storeExpense']);
            Route::put('/transactions/expense/{id}', [TransactionController::class, 'update']);
            Route::post('/transactions/{id}/submit', [TransactionController::class, 'submit']);
            Route::delete('/transactions/{id}', [TransactionController::class, 'destroy']);
            Route::post('/transactions/{id}/attachments', [AttachmentController::class, 'store']);
            Route::post('/initial-balances', [InitialBalanceController::class, 'store']);
            Route::post('/fixed-assets', [FixedAssetController::class, 'store']);
            Route::put('/fixed-assets/{id}', [FixedAssetController::class, 'update']);
            Route::delete('/fixed-assets/{id}', [FixedAssetController::class, 'destroy']);
            Route::post('/fixed-assets/depreciate', [FixedAssetController::class, 'processMonthlyDepreciation']);

            // Payables & Receivables Actions
            Route::post('/payables', [PayableController::class, 'store']);
            Route::put('/payables/{id}', [PayableController::class, 'update']);
            Route::delete('/payables/{id}', [PayableController::class, 'destroy']);
            Route::post('/payables/{id}/pay', [PayableController::class, 'pay']);
            Route::post('/receivables', [ReceivableController::class, 'store']);
            Route::put('/receivables/{id}', [ReceivableController::class, 'update']);
            Route::delete('/receivables/{id}', [ReceivableController::class, 'destroy']);
            Route::post('/receivables/{id}/receive', [ReceivableController::class, 'receive']);
            Route::put('/debt-payments/{id}', [DebtPaymentController::class, 'update']);
            Route::delete('/debt-payments/{id}', [DebtPaymentController::class, 'destroy']);
        });

        // --- OWNER APPROVAL & REOPEN WORKFLOW (OWNER ONLY) ---
        Route::middleware('role:OWNER')->group(function () {
            Route::get('/approvals/pending', [ApprovalController::class, 'pendingQueue']);
            Route::post('/transactions/{id}/approve', [ApprovalController::class, 'approve']);
            Route::post('/transactions/{id}/reject', [ApprovalController::class, 'reject']);
            Route::post('/accounting-periods/{id}/reopen', [AccountingPeriodController::class, 'approveReopen']);
        });

        // --- DONOR MANAGEMENT (ADMIN & PENGELOLA) ---
        Route::middleware('role:ADMIN,PENGELOLA')->group(function () {
            Route::post('/donors', [DonorController::class, 'store']);
            Route::put('/donors/{id}', [DonorController::class, 'update']);
            Route::delete('/donors/{id}', [DonorController::class, 'destroy']);
        });

        // --- PERIOD MANAGEMENT & REVERSAL (ADMIN & OWNER) ---
        Route::middleware('role:ADMIN,OWNER')->group(function () {
            Route::post('/accounting-periods', [AccountingPeriodController::class, 'store']);
            Route::post('/accounting-periods/{id}/close', [AccountingPeriodController::class, 'closePeriod']);
            Route::post('/accounting-periods/{id}/reopen-request', [AccountingPeriodController::class, 'requestReopen']);
            Route::post('/transactions/{id}/reverse', [ReversalController::class, 'reverseTransaction']);
        });

        // --- ADMIN ONLY MASTER DATA MANAGEMENT, POSTING & MANUAL JOURNALS ---
        Route::middleware('role:ADMIN')->group(function () {
            // Posting & Manual Journals
            Route::post('/transactions/{id}/post', [PostingController::class, 'postTransaction']);
            Route::post('/journals', [JournalController::class, 'store']);

            // User Management
            Route::get('/users', [UserController::class, 'index']);
            Route::post('/users', [UserController::class, 'store']);
            Route::put('/users/{id}', [UserController::class, 'update']);
            Route::post('/users/{id}/status', [UserController::class, 'toggleStatus']);

            // COA Management
            Route::post('/accounts', [AccountController::class, 'store']);
            Route::put('/accounts/{id}', [AccountController::class, 'update']);
            Route::post('/accounts/{id}/deactivate', [AccountController::class, 'deactivate']);
            Route::delete('/accounts/{id}', [AccountController::class, 'destroy']);

            // Program Management
            Route::post('/programs', [ProgramController::class, 'store']);
            Route::put('/programs/{id}', [ProgramController::class, 'update']);
            Route::post('/programs/{id}/deactivate', [ProgramController::class, 'deactivate']);
            Route::delete('/programs/{id}', [ProgramController::class, 'destroy']);

            // Kas & Bank Management
            Route::post('/cash-bank-accounts', [CashBankAccountController::class, 'store']);
            Route::put('/cash-bank-accounts/{id}', [CashBankAccountController::class, 'update']);
            Route::delete('/cash-bank-accounts/{id}', [CashBankAccountController::class, 'destroy']);
        });
    });
});

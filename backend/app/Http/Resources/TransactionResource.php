<?php

namespace App\Http\Resources;

use App\Services\JournalPreviewService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $allowedActions = ['VIEW'];

        if ($user && $this->isEditableBy($user)) {
            $allowedActions[] = 'EDIT';
            $allowedActions[] = 'UPLOAD_ATTACHMENT';
            if ($this->isDraft() || $this->isRejected()) {
                $allowedActions[] = 'SUBMIT';
            }
        }

        if ($user && $user->isOwner() && $this->isSubmitted()) {
            $allowedActions[] = 'APPROVE';
            $allowedActions[] = 'REJECT';
        }

        return [
            'id' => $this->id,
            'transaction_no' => $this->transaction_no,
            'type' => $this->type,
            'transaction_date' => $this->transaction_date?->format('Y-m-d'),
            'accounting_period_id' => $this->accounting_period_id,
            'accounting_period' => $this->accountingPeriod ? [
                'id' => $this->accountingPeriod->id,
                'name' => $this->accountingPeriod->name,
                'status' => $this->accountingPeriod->status,
            ] : null,
            'program_id' => $this->program_id,
            'program' => $this->program ? [
                'id' => $this->program->id,
                'code' => $this->program->code,
                'name' => $this->program->name,
            ] : null,
            'donor_id' => $this->donor_id,
            'donor' => $this->donor ? [
                'id' => $this->donor->id,
                'name' => $this->donor->name,
            ] : null,
            'cash_bank_account_id' => $this->cash_bank_account_id,
            'cash_bank_account' => $this->cashBankAccount ? [
                'id' => $this->cashBankAccount->id,
                'name' => $this->cashBankAccount->name,
                'type' => $this->cashBankAccount->type,
            ] : null,
            'income_account_id' => $this->income_account_id,
            'income_account' => $this->incomeAccount ? [
                'id' => $this->incomeAccount->id,
                'code' => $this->incomeAccount->code,
                'name' => $this->incomeAccount->name,
            ] : null,
            'expense_account_id' => $this->expense_account_id,
            'expense_account' => $this->expenseAccount ? [
                'id' => $this->expenseAccount->id,
                'code' => $this->expenseAccount->code,
                'name' => $this->expenseAccount->name,
            ] : null,
            'counterparty_name' => $this->counterparty_name,
            'restriction_type' => $this->restriction_type,
            'amount' => number_format((float) $this->amount, 2, '.', ''),
            'description' => $this->description,
            'status' => $this->status,
            'created_by' => $this->created_by,
            'creator' => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ] : null,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'approved_at' => $this->approved_at?->toIso8601String(),
            'posted_at' => $this->posted_at?->toIso8601String(),
            'attachments' => AttachmentResource::collection($this->whenLoaded('attachments')),
            'approval_history' => $this->approvals->map(function ($appr) {
                return [
                    'id' => $appr->id,
                    'action' => $appr->action,
                    'actor_name' => $appr->actor ? $appr->actor->name : 'Sistem',
                    'comments' => $appr->comments,
                    'created_at' => $appr->created_at?->toIso8601String(),
                ];
            }),
            'journal_preview' => JournalPreviewService::buildPreview($this->resource),
            'allowed_actions' => array_values(array_unique($allowedActions)),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

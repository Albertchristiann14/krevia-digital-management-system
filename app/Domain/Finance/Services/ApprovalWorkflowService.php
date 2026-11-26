<?php

namespace App\Domain\Finance\Services;

use App\Domain\Finance\Models\FinanceApprovalAction;
use App\Domain\Finance\Models\FinanceApprovalRequest;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApprovalWorkflowService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function submitRequest(
        string $requestType,
        Model $approvable,
        User $requester,
        float $amount,
        string $summary
    ): FinanceApprovalRequest {
        return DB::transaction(function () use ($requestType, $approvable, $requester, $amount, $summary): FinanceApprovalRequest {
            $count = FinanceApprovalRequest::count() + 1;
            $req = FinanceApprovalRequest::create([
                'request_no' => sprintf('APR/KRV/%s/%04d', now()->format('Y'), $count),
                'request_type' => $requestType,
                'approvable_type' => $approvable::class,
                'approvable_id' => (string) $approvable->getKey(),
                'requester_id' => $requester->id,
                'amount' => round($amount, 2),
                'summary' => $summary,
                'status' => FinanceApprovalRequest::STATUS_PENDING,
                'submitted_at' => now(),
            ]);

            FinanceApprovalAction::create([
                'approval_request_id' => $req->id,
                'actor_id' => $requester->id,
                'action' => 'Submitted',
                'reason' => $summary,
                'acted_at' => now(),
            ]);

            return $req;
        });
    }

    public function approve(FinanceApprovalRequest $approvalRequest, User $founder, ?string $reason = null): FinanceApprovalRequest
    {
        if (! $founder->isManagingDirector()) {
            abort(403, 'Founder authorization is required to approve financial requests.');
        }

        if ($approvalRequest->status !== FinanceApprovalRequest::STATUS_PENDING) {
            throw ValidationException::withMessages([
                'approval' => "Approval request {$approvalRequest->request_no} is already {$approvalRequest->status}.",
            ]);
        }

        return DB::transaction(function () use ($approvalRequest, $founder, $reason): FinanceApprovalRequest {
            $approvalRequest->update([
                'status' => FinanceApprovalRequest::STATUS_APPROVED,
                'decided_by' => $founder->id,
                'decided_at' => now(),
                'decision_reason' => $reason,
            ]);

            FinanceApprovalAction::create([
                'approval_request_id' => $approvalRequest->id,
                'actor_id' => $founder->id,
                'action' => 'Approved',
                'reason' => $reason,
                'acted_at' => now(),
            ]);

            $modelClass = $approvalRequest->approvable_type;
            if (class_exists($modelClass)) {
                $target = $modelClass::query()->find($approvalRequest->approvable_id);
                if ($target && array_key_exists('approval_status', $target->getAttributes())) {
                    $target->update(['approval_status' => 'Approved']);
                } elseif ($target && array_key_exists('status', $target->getAttributes()) && $target->status === 'Pending Approval') {
                    $target->update(['status' => 'Approved']);
                }
            }

            $this->audit->log(
                'finance.approval_approved',
                "Founder approved {$approvalRequest->request_type} ({$approvalRequest->request_no}).",
                $approvalRequest,
                ['status' => FinanceApprovalRequest::STATUS_PENDING],
                ['status' => FinanceApprovalRequest::STATUS_APPROVED, 'reason' => $reason],
                $founder->id
            );

            return $approvalRequest->fresh('actions');
        });
    }

    public function reject(FinanceApprovalRequest $approvalRequest, User $founder, string $reason): FinanceApprovalRequest
    {
        if (! $founder->isManagingDirector()) {
            abort(403, 'Founder authorization is required to reject financial requests.');
        }

        if ($approvalRequest->status !== FinanceApprovalRequest::STATUS_PENDING) {
            throw ValidationException::withMessages([
                'approval' => "Approval request {$approvalRequest->request_no} is already {$approvalRequest->status}.",
            ]);
        }

        return DB::transaction(function () use ($approvalRequest, $founder, $reason): FinanceApprovalRequest {
            $approvalRequest->update([
                'status' => FinanceApprovalRequest::STATUS_REJECTED,
                'decided_by' => $founder->id,
                'decided_at' => now(),
                'decision_reason' => $reason,
            ]);

            FinanceApprovalAction::create([
                'approval_request_id' => $approvalRequest->id,
                'actor_id' => $founder->id,
                'action' => 'Rejected',
                'reason' => $reason,
                'acted_at' => now(),
            ]);

            $modelClass = $approvalRequest->approvable_type;
            if (class_exists($modelClass)) {
                $target = $modelClass::query()->find($approvalRequest->approvable_id);
                if ($target && array_key_exists('approval_status', $target->getAttributes())) {
                    $target->update(['approval_status' => 'Rejected']);
                } elseif ($target && array_key_exists('status', $target->getAttributes()) && $target->status === 'Pending Approval') {
                    $target->update(['status' => 'Rejected']);
                }
            }

            $this->audit->log(
                'finance.approval_rejected',
                "Founder rejected {$approvalRequest->request_type} ({$approvalRequest->request_no}). Reason: {$reason}",
                $approvalRequest,
                ['status' => FinanceApprovalRequest::STATUS_PENDING],
                ['status' => FinanceApprovalRequest::STATUS_REJECTED, 'reason' => $reason],
                $founder->id
            );

            return $approvalRequest->fresh('actions');
        });
    }
}

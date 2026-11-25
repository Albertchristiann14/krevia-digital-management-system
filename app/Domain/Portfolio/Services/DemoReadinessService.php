<?php

namespace App\Domain\Portfolio\Services;

use App\Domain\Portfolio\Models\DemoCriteriaCheck;
use App\Domain\Portfolio\Models\DemoProduct;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DemoReadinessService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function seedCriteriaForDemo(DemoProduct $demo): void
    {
        foreach (DemoProduct::CRITERIA_DEFINITIONS as $key => [$order, $label]) {
            DemoCriteriaCheck::firstOrCreate(
                ['demo_product_id' => $demo->id, 'criterion_key' => $key],
                ['label' => $label, 'sort_order' => $order, 'is_met' => false]
            );
        }
    }

    public function transitionStatus(DemoProduct $demo, string $newStatus, User $actor, ?string $note = null): DemoProduct
    {
        if (! in_array($newStatus, DemoProduct::STATUSES, true)) {
            throw ValidationException::withMessages([
                'status' => "Invalid demo status '{$newStatus}'.",
            ]);
        }

        if ($newStatus === 'In Progress' && $demo->status !== 'In Progress') {
            $activeCount = DemoProduct::query()
                ->where('status', 'In Progress')
                ->where('id', '!=', $demo->id)
                ->count();

            if ($activeCount >= DemoProduct::MAX_ACTIVE_DEMOS) {
                throw ValidationException::withMessages([
                    'status' => 'Maximum 2 active demos (In Progress) can be worked on simultaneously (Sheet 10 Rule). Complete or pause an active demo first.',
                ]);
            }
        }

        if ($newStatus === 'Ready to Present') {
            $this->assertReadyToPresent($demo);
        }

        return DB::transaction(function () use ($demo, $newStatus, $actor, $note): DemoProduct {
            $oldStatus = $demo->status;

            $demo->update([
                'status' => $newStatus,
                'is_ready_to_present' => $newStatus === 'Ready to Present',
                'notes' => $note !== null && trim($note) !== '' ? $note : $demo->notes,
            ]);

            $this->audit->log(
                'portfolio.demo_status_changed',
                "Demo {$demo->code} ({$demo->name}) moved from {$oldStatus} to {$newStatus}.",
                $demo,
                ['status' => $oldStatus],
                ['status' => $newStatus],
                $actor->id
            );

            return $demo->fresh();
        });
    }

    public function toggleCriterion(
        DemoCriteriaCheck $check,
        bool $isMet,
        User $actor,
        ?string $evidenceNote = null
    ): DemoProduct {
        if ($check->criterion_key === 'dual_approved') {
            throw ValidationException::withMessages([
                'criterion' => 'Criterion #6 (Disetujui Aldo dan Albert) is fulfilled automatically when both Technical (Aldo) and Commercial (Albert) approvals are recorded.',
            ]);
        }

        return DB::transaction(function () use ($check, $isMet, $actor, $evidenceNote): DemoProduct {
            $check->update([
                'is_met' => $isMet,
                'evidence_note' => $evidenceNote ?? $check->evidence_note,
                'checked_by' => $isMet ? $actor->id : null,
                'checked_at' => $isMet ? now() : null,
            ]);

            $demo = $check->demoProduct->fresh();
            $this->syncReadinessState($demo, $actor);

            $this->audit->log(
                'portfolio.criterion_updated',
                "Criterion '{$check->label}' on {$demo->code} set to " . ($isMet ? 'Met' : 'Not Met') . '.',
                $demo,
                null,
                ['criterion_key' => $check->criterion_key, 'is_met' => $isMet],
                $actor->id
            );

            return $demo->fresh();
        });
    }

    public function approveTechnical(DemoProduct $demo, User $actor): DemoProduct
    {
        return DB::transaction(function () use ($demo, $actor): DemoProduct {
            $demo->update([
                'technical_approved_by' => $actor->id,
                'technical_approved_at' => now(),
            ]);

            $this->syncDualCriterion($demo->fresh(), $actor);

            $this->audit->log(
                'portfolio.demo_technical_approved',
                "Technical readiness approved for {$demo->code} by {$actor->name}.",
                $demo,
                null,
                null,
                $actor->id
            );

            return $demo->fresh();
        });
    }

    public function approveCommercial(DemoProduct $demo, User $actor): DemoProduct
    {
        return DB::transaction(function () use ($demo, $actor): DemoProduct {
            $demo->update([
                'commercial_approved_by' => $actor->id,
                'commercial_approved_at' => now(),
            ]);

            $this->syncDualCriterion($demo->fresh(), $actor);

            $this->audit->log(
                'portfolio.demo_commercial_approved',
                "Commercial readiness approved for {$demo->code} by {$actor->name}.",
                $demo,
                null,
                null,
                $actor->id
            );

            return $demo->fresh();
        });
    }

    private function syncDualCriterion(DemoProduct $demo, User $actor): void
    {
        $dualMet = $demo->technical_approved_by !== null && $demo->commercial_approved_by !== null;

        DemoCriteriaCheck::query()
            ->where('demo_product_id', $demo->id)
            ->where('criterion_key', 'dual_approved')
            ->update([
                'is_met' => $dualMet,
                'checked_by' => $dualMet ? $actor->id : null,
                'checked_at' => $dualMet ? now() : null,
                'evidence_note' => $dualMet ? 'Technical (CTO) & Commercial (Managing Director) approvals recorded.' : null,
            ]);

        $this->syncReadinessState($demo, $actor);
    }

    private function syncReadinessState(DemoProduct $demo, User $actor): void
    {
        $allSixMet = $demo->criteriaChecks()->where('is_met', true)->count() === 6
            && $demo->technical_approved_by !== null
            && $demo->commercial_approved_by !== null;

        if ($allSixMet && ! $demo->is_ready_to_present) {
            $demo->update([
                'is_ready_to_present' => true,
                'status' => 'Ready to Present',
            ]);
        } elseif (! $allSixMet && $demo->is_ready_to_present) {
            $demo->update([
                'is_ready_to_present' => false,
                'status' => $demo->status === 'Ready to Present' ? 'Under Review' : $demo->status,
            ]);
        }
    }

    public function assertReadyToPresent(DemoProduct $demo): void
    {
        $unmet = $demo->criteriaChecks()
            ->where('is_met', false)
            ->pluck('label')
            ->all();

        if ($demo->technical_approved_by === null || $demo->commercial_approved_by === null) {
            if (! in_array('Disetujui Aldo dan Albert', $unmet, true)) {
                $unmet[] = 'Disetujui Aldo dan Albert';
            }
        }

        if ($unmet !== []) {
            throw ValidationException::withMessages([
                'status' => 'Demo cannot be marked Ready to Present until all 6 criteria are completed and approved by Aldo & Albert. Missing: ' . implode(', ', $unmet),
            ]);
        }
    }
}

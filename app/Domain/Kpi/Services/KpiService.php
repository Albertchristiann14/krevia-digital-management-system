<?php

namespace App\Domain\Kpi\Services;

use App\Domain\Kpi\Models\KpiDefinition;
use App\Domain\Kpi\Models\KpiEvaluation;
use App\Domain\Kpi\Models\KpiEvaluationItem;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class KpiService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array<int, float|string>  $weightsByDefinitionId
     */
    public function updateMemberWeights(User $member, array $weightsByDefinitionId, User $actor): void
    {
        $definitions = KpiDefinition::query()
            ->where('user_id', $member->id)
            ->where('is_active', true)
            ->get()
            ->keyBy('id');

        $totalWeight = 0.0;
        foreach ($definitions as $id => $def) {
            $w = isset($weightsByDefinitionId[$id])
                ? (float) $weightsByDefinitionId[$id]
                : (float) $def->weight;
            if ($w < 0 || $w > 1) {
                throw ValidationException::withMessages([
                    'weights' => 'Each KPI weight must be between 0.00 and 1.00.',
                ]);
            }
            $totalWeight += $w;
        }

        if (abs($totalWeight - 1.0) > 0.0005) {
            throw ValidationException::withMessages([
                'weights' => sprintf(
                    'Total active KPI weight for %s must equal 1.00 (100%%). Current sum: %.4f.',
                    $member->name,
                    $totalWeight
                ),
            ]);
        }

        DB::transaction(function () use ($definitions, $weightsByDefinitionId, $member, $actor): void {
            foreach ($definitions as $id => $def) {
                if (isset($weightsByDefinitionId[$id])) {
                    $def->update(['weight' => round((float) $weightsByDefinitionId[$id], 4)]);
                }
            }

            $this->audit->log(
                'kpi.weights_updated',
                "Updated KPI weights for {$member->name} (sum = 1.00).",
                $member,
                null,
                ['weights' => $weightsByDefinitionId],
                $actor->id
            );
        });
    }

    /**
     * @param  array<int, array{actual_value?: string|null, score: float|int|string, notes?: string|null}>  $itemsInput
     */
    public function recordEvaluation(
        User $member,
        string $periodType,
        string $periodLabel,
        array $itemsInput,
        User $evaluator,
        ?string $notes = null
    ): KpiEvaluation {
        $definitions = KpiDefinition::query()
            ->where('user_id', $member->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        $totalWeight = (float) $definitions->sum('weight');
        if (abs($totalWeight - 1.0) > 0.0005) {
            throw ValidationException::withMessages([
                'weights' => "Active KPI weights for {$member->name} do not sum to 1.00 (currently {$totalWeight}).",
            ]);
        }

        return DB::transaction(function () use (
            $member,
            $periodType,
            $periodLabel,
            $definitions,
            $itemsInput,
            $evaluator,
            $notes,
            $totalWeight
        ): KpiEvaluation {
            $evaluation = KpiEvaluation::updateOrCreate(
                ['user_id' => $member->id, 'period_label' => $periodLabel],
                [
                    'period_type' => $periodType,
                    'total_weight' => round($totalWeight, 4),
                    'evaluated_by' => $evaluator->id,
                    'status' => 'Draft',
                    'notes' => $notes,
                ]
            );

            $totalScore = 0.0;

            foreach ($definitions as $def) {
                $entry = $itemsInput[$def->id] ?? [];
                $score = isset($entry['score']) ? (float) $entry['score'] : 0.0;
                if ($score < 0 || $score > 100) {
                    throw ValidationException::withMessages([
                        'items' => "Score for KPI '{$def->name}' must be between 0 and 100.",
                    ]);
                }

                $weighted = round(((float) $def->weight) * $score, 2);
                $totalScore += $weighted;

                KpiEvaluationItem::updateOrCreate(
                    [
                        'kpi_evaluation_id' => $evaluation->id,
                        'kpi_definition_id' => $def->id,
                    ],
                    [
                        'actual_value' => $entry['actual_value'] ?? null,
                        'score' => round($score, 2),
                        'weight_snapshot' => $def->weight,
                        'weighted_score' => $weighted,
                        'notes' => $entry['notes'] ?? null,
                    ]
                );
            }

            $totalScore = round($totalScore, 2);
            $evaluation->update([
                'total_score' => $totalScore,
                'rating_band' => KpiEvaluation::resolveRatingBand($totalScore),
            ]);

            $this->audit->log(
                'kpi.evaluation_recorded',
                "Recorded KPI evaluation for {$member->name} ({$periodLabel}): {$totalScore}/100.",
                $evaluation,
                null,
                ['total_score' => $totalScore, 'rating_band' => $evaluation->rating_band],
                $evaluator->id
            );

            return $evaluation->fresh('items.definition');
        });
    }

    public function approveEvaluation(KpiEvaluation $evaluation, User $approver): KpiEvaluation
    {
        $evaluation->update([
            'status' => 'Approved',
            'approved_by' => $approver->id,
            'approved_at' => now(),
        ]);

        $this->audit->log(
            'kpi.evaluation_approved',
            "Approved KPI evaluation for {$evaluation->user->name} ({$evaluation->period_label}).",
            $evaluation,
            null,
            null,
            $approver->id
        );

        return $evaluation->fresh();
    }
}

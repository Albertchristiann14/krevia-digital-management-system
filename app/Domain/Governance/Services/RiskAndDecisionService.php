<?php

namespace App\Domain\Governance\Services;

use App\Domain\Governance\Models\Decision;
use App\Domain\Governance\Models\Meeting;
use App\Domain\Governance\Models\Risk;
use App\Domain\Governance\Models\RiskReview;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RiskAndDecisionService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function createOrUpdateRisk(array $data, User $actor, ?Risk $existing = null): Risk
    {
        $likelihood = (int) $data['likelihood'];
        $impact = (int) $data['impact'];
        $score = $likelihood * $impact;
        $level = Risk::resolveLevel($score);
        $contingency = trim((string) ($data['contingency_plan'] ?? ''));

        if ($score >= 15 && $contingency === '') {
            throw ValidationException::withMessages([
                'contingency_plan' => "High-severity risks (score {$score} >= 15) require a contingency plan (Sheet 14 Rule).",
            ]);
        }

        return DB::transaction(function () use ($data, $likelihood, $impact, $score, $level, $contingency, $actor, $existing): Risk {
            if ($existing) {
                $existing->update([
                    'category' => $data['category'],
                    'title' => $data['title'],
                    'likelihood' => $likelihood,
                    'impact' => $impact,
                    'score' => $score,
                    'level' => $level,
                    'pic_user_id' => $data['pic_user_id'] ?? $existing->pic_user_id,
                    'mitigation_plan' => $data['mitigation_plan'],
                    'contingency_plan' => $contingency !== '' ? $contingency : null,
                    'status' => $data['status'] ?? $existing->status,
                    'last_reviewed_at' => now()->toDateString(),
                    'notes' => $data['notes'] ?? $existing->notes,
                ]);

                $risk = $existing->fresh();
                $this->audit->log('governance.risk_updated', "Updated risk {$risk->code} (Score {$score} - {$level}).", $risk, null, null, $actor->id);

                return $risk;
            }

            $maxNum = Risk::withTrashed()
                ->where('code', 'like', 'R-%')
                ->pluck('code')
                ->map(fn (string $c) => (int) str_replace('R-', '', $c))
                ->max() ?? 0;

            $risk = Risk::create([
                'code' => sprintf('R-%02d', $maxNum + 1),
                'category' => $data['category'],
                'title' => $data['title'],
                'likelihood' => $likelihood,
                'impact' => $impact,
                'score' => $score,
                'level' => $level,
                'pic_user_id' => $data['pic_user_id'] ?? $actor->id,
                'mitigation_plan' => $data['mitigation_plan'],
                'contingency_plan' => $contingency !== '' ? $contingency : null,
                'status' => $data['status'] ?? 'Open',
                'last_reviewed_at' => now()->toDateString(),
                'notes' => $data['notes'] ?? null,
            ]);

            $this->audit->log('governance.risk_created', "Logged risk {$risk->code} (Score {$score} - {$level}).", $risk, null, null, $actor->id);

            return $risk;
        });
    }

    public function reviewRisk(Risk $risk, int $likelihood, int $impact, ?string $status, ?string $notes, User $reviewer): Risk
    {
        $score = $likelihood * $impact;
        $level = Risk::resolveLevel($score);

        if ($score >= 15 && empty(trim((string) $risk->contingency_plan))) {
            throw ValidationException::withMessages([
                'contingency_plan' => "Risk {$risk->code} reached score {$score} (>= 15). Add a contingency plan first.",
            ]);
        }

        return DB::transaction(function () use ($risk, $likelihood, $impact, $score, $level, $status, $notes, $reviewer): Risk {
            RiskReview::create([
                'risk_id' => $risk->id,
                'reviewer_user_id' => $reviewer->id,
                'likelihood' => $likelihood,
                'impact' => $impact,
                'score' => $score,
                'level' => $level,
                'notes' => $notes,
                'reviewed_at' => now(),
            ]);

            $risk->update([
                'likelihood' => $likelihood,
                'impact' => $impact,
                'score' => $score,
                'level' => $level,
                'status' => $status ?: $risk->status,
                'last_reviewed_at' => now()->toDateString(),
            ]);

            $this->audit->log('governance.risk_reviewed', "Reviewed risk {$risk->code}: score {$score} ({$level}).", $risk, null, null, $reviewer->id);

            return $risk->fresh();
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createDecision(array $data, User $actor, ?Meeting $sourceMeeting = null): Decision
    {
        return DB::transaction(function () use ($data, $actor, $sourceMeeting): Decision {
            $maxNum = Decision::withTrashed()
                ->where('code', 'like', 'D-%')
                ->pluck('code')
                ->map(fn (string $c) => (int) str_replace('D-', '', $c))
                ->max() ?? 0;

            $decision = Decision::create([
                'code' => sprintf('D-%02d', $maxNum + 1),
                'decision_date' => $data['decision_date'] ?? now()->toDateString(),
                'topic_decision' => $data['topic_decision'],
                'deadline' => $data['deadline'] ?? null,
                'status' => $data['status'] ?? 'Open',
                'pic_user_id' => $data['pic_user_id'] ?? $actor->id,
                'follow_up' => $data['follow_up'] ?? null,
                'data_status' => $data['data_status'] ?? 'Disepakati',
                'source_meeting_id' => $sourceMeeting?->id,
            ]);

            $this->audit->log(
                'governance.decision_logged',
                "Recorded decision {$decision->code}" . ($sourceMeeting ? " from meeting {$sourceMeeting->code}." : '.'),
                $decision,
                null,
                null,
                $actor->id
            );

            return $decision;
        });
    }
}

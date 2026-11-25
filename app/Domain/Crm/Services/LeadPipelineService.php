<?php

namespace App\Domain\Crm\Services;

use App\Domain\Crm\Models\Lead;
use App\Domain\Crm\Models\PipelineHistory;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LeadPipelineService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array<string, mixed>  $context
     */
    public function transitionStage(Lead $lead, string $newStage, User $actor, array $context = []): Lead
    {
        if (! in_array($newStage, Lead::STAGES, true)) {
            throw ValidationException::withMessages([
                'stage' => "Invalid pipeline stage '{$newStage}'.",
            ]);
        }

        $oldStage = $lead->stage;

        if ($newStage === 'Lost' && empty(trim((string) ($context['lost_reason'] ?? $lead->lost_reason)))) {
            throw ValidationException::withMessages([
                'lost_reason' => 'A Lost reason must be recorded before moving a prospect to Lost.',
            ]);
        }

        if ($newStage === 'Follow-up Later' && empty($context['next_follow_up_at'] ?? $lead->next_follow_up_at)) {
            throw ValidationException::withMessages([
                'next_follow_up_at' => 'A next follow-up date is required for Follow-up Later.',
            ]);
        }

        return DB::transaction(function () use ($lead, $oldStage, $newStage, $actor, $context): Lead {
            $today = now()->toDateString();
            $updates = ['stage' => $newStage];

            if ($newStage === 'Initial Contact') {
                $updates['contacted_at'] = $context['event_date'] ?? $lead->contacted_at ?? $today;
            } elseif ($newStage === 'Discovery Meeting') {
                $updates['discovery_meeting_at'] = $context['event_date'] ?? $lead->discovery_meeting_at ?? $today;
            } elseif ($newStage === 'Proposal Sent') {
                $updates['proposal_sent_at'] = $context['event_date'] ?? $lead->proposal_sent_at ?? $today;
            } elseif ($newStage === 'Won') {
                $updates['closed_at'] = $context['event_date'] ?? $lead->closed_at ?? $today;
            } elseif ($newStage === 'Lost') {
                $updates['closed_at'] = $context['event_date'] ?? $lead->closed_at ?? $today;
                $updates['lost_reason'] = $context['lost_reason'] ?? $lead->lost_reason;
            } elseif ($newStage === 'Follow-up Later') {
                $updates['next_follow_up_at'] = $context['next_follow_up_at'] ?? $lead->next_follow_up_at;
            }

            if (isset($context['next_follow_up_at'])) {
                $updates['next_follow_up_at'] = $context['next_follow_up_at'];
            }

            $lead->update($updates);

            PipelineHistory::create([
                'lead_id' => $lead->id,
                'from_stage' => $oldStage,
                'to_stage' => $newStage,
                'changed_by' => $actor->id,
                'evidence_note' => $context['evidence_note'] ?? null,
                'changed_at' => now(),
            ]);

            $this->audit->log(
                'crm.lead_stage_changed',
                "Lead {$lead->code} ({$lead->company->name}) moved from {$oldStage} to {$newStage}.",
                $lead,
                ['stage' => $oldStage],
                ['stage' => $newStage, 'evidence_note' => $context['evidence_note'] ?? null],
                $actor->id
            );

            return $lead->fresh();
        });
    }
}

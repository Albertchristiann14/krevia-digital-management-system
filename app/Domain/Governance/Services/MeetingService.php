<?php

namespace App\Domain\Governance\Services;

use App\Domain\Governance\Models\ActionItem;
use App\Domain\Governance\Models\Meeting;
use App\Domain\Governance\Models\MeetingMinute;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MeetingService
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function publishAgenda(Meeting $meeting, string $agenda, ?string $participantsList, User $actor): Meeting
    {
        $meeting->update([
            'agenda' => trim($agenda),
            'agenda_sent_at' => $meeting->agenda_sent_at ?? now(),
            'participants_list' => $participantsList ?? $meeting->participants_list,
            'status' => $meeting->status === 'Planned' ? 'Agenda Ready' : $meeting->status,
        ]);

        $this->audit->log('governance.meeting_agenda_set', "Prepared H-1 agenda for meeting {$meeting->code}.", $meeting, null, null, $actor->id);

        return $meeting->fresh();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function recordMinutes(Meeting $meeting, array $data, User $actor): MeetingMinute
    {
        if (empty(trim((string) $meeting->agenda))) {
            throw ValidationException::withMessages([
                'agenda' => 'Meeting cannot be completed or have minutes recorded without a written agenda (Sheet 15 H-1 Rule).',
            ]);
        }

        return DB::transaction(function () use ($meeting, $data, $actor): MeetingMinute {
            $now = now();
            $deadline24h = $meeting->scheduled_date->copy()->endOfDay()->addHours(24);
            $withinSla = $now->lessThanOrEqualTo($deadline24h);

            $minute = MeetingMinute::updateOrCreate(
                ['meeting_id' => $meeting->id],
                [
                    'recorded_by' => $actor->id,
                    'summary' => $data['summary'],
                    'decisions_summary' => $data['decisions_summary'] ?? null,
                    'escalations' => $data['escalations'] ?? null,
                    'submitted_at' => $now,
                    'is_within_24h_sla' => $withinSla,
                ]
            );

            $meeting->update(['status' => 'Completed']);

            $this->audit->log(
                'governance.meeting_minutes_recorded',
                "Recorded minutes for {$meeting->code} (24h SLA: " . ($withinSla ? 'Met' : 'Late') . ').',
                $meeting,
                null,
                null,
                $actor->id
            );

            return $minute;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function addActionItem(Meeting $meeting, array $data, User $actor): ActionItem
    {
        $item = ActionItem::create([
            'meeting_id' => $meeting->id,
            'title' => $data['title'],
            'pic_user_id' => $data['pic_user_id'] ?? $actor->id,
            'due_date' => $data['due_date'] ?? null,
            'evidence_note' => $data['evidence_note'] ?? null,
            'status' => 'Open',
        ]);

        $this->audit->log('governance.action_item_added', "Added action item '{$item->title}' to {$meeting->code}.", $meeting, null, null, $actor->id);

        return $item;
    }
}

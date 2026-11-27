<?php

namespace App\Domain\VirtualOffice\Services;

use App\Domain\Crm\Models\Company;
use App\Domain\Crm\Models\Contact;
use App\Domain\Project\Models\Project;
use App\Domain\VirtualOffice\Events\OfficeVisitorUpdated;
use App\Domain\VirtualOffice\Models\OfficeEvent;
use App\Domain\VirtualOffice\Models\OfficePresence;
use App\Domain\VirtualOffice\Models\OfficeVisitor;
use App\Domain\VirtualOffice\Models\OfficeZone;
use App\Domain\Workplan\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WorkspaceObjectService
{
    public function __construct(
        private readonly PresenceService $presenceService,
        private readonly CommunicationService $communicationService,
    ) {}

    public function sweepExpiredVisitors(): int
    {
        return OfficeVisitor::query()
            ->where('status', 'waiting')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->update(['status' => 'expired']);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listActiveVisitors(): array
    {
        $this->sweepExpiredVisitors();

        return OfficeVisitor::query()
            ->with(['company:id,name', 'contact:id,name', 'host:id,name', 'zone:id,slug,name'])
            ->whereIn('status', ['waiting', 'admitted', 'delayed'])
            ->orderByDesc('id')
            ->limit(25)
            ->get()
            ->map(fn (OfficeVisitor $v) => $this->serializeVisitor($v))
            ->values()
            ->all();
    }

    /**
     * @return array{companies: array<int, array<string, mixed>>, contacts: array<int, array<string, mixed>>}
     */
    public function crmQuickOptions(?string $query = null): array
    {
        $q = trim((string) $query);

        $companies = Company::query()
            ->when($q !== '', fn ($qb) => $qb->where('name', 'like', "%{$q}%"))
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'industry'])
            ->map(fn (Company $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'industry' => $c->industry,
            ])
            ->values()
            ->all();

        $contacts = Contact::query()
            ->with('company:id,name')
            ->when($q !== '', fn ($qb) => $qb->where('name', 'like', "%{$q}%"))
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'company_id', 'name', 'role_title'])
            ->map(fn (Contact $ct) => [
                'id' => $ct->id,
                'company_id' => $ct->company_id,
                'company_name' => $ct->company?->name,
                'name' => $ct->name,
                'role_title' => $ct->role_title,
            ])
            ->values()
            ->all();

        return [
            'companies' => $companies,
            'contacts' => $contacts,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function checkInVisitor(User $actor, array $data): array
    {
        $reception = OfficeZone::query()->where('slug', 'reception')->first();

        $visitor = DB::transaction(function () use ($actor, $data, $reception): OfficeVisitor {
            $companyName = isset($data['company_name']) ? strip_tags(trim((string) $data['company_name'])) : null;
            if (! $companyName && ! empty($data['company_id'])) {
                $companyName = Company::query()->whereKey($data['company_id'])->value('name');
            }

            $visitor = OfficeVisitor::create([
                'name' => strip_tags(trim((string) $data['name'])),
                'company_name' => $companyName,
                'company_id' => $data['company_id'] ?? null,
                'contact_id' => $data['contact_id'] ?? null,
                'purpose' => strip_tags(trim((string) $data['purpose'])),
                'host_user_id' => (int) $data['host_user_id'],
                'zone_id' => $reception?->id,
                'status' => 'waiting',
                'checked_in_at' => now(),
                'expires_at' => now()->addHours(OfficeVisitor::EXPIRY_HOURS),
            ]);

            OfficeEvent::create([
                'type' => 'visitor_checked_in',
                'actor_id' => $actor->id,
                'zone_id' => $reception?->id,
                'payload' => [
                    'visitor_id' => $visitor->id,
                    'visitor_name' => $visitor->name,
                    'company_name' => $visitor->company_name,
                    'host_user_id' => $visitor->host_user_id,
                ],
                'created_at' => now(),
            ]);

            return $visitor;
        });

        $serialized = $this->serializeVisitor($visitor->load(['company:id,name', 'contact:id,name', 'host:id,name', 'zone:id,slug,name']));
        event(new OfficeVisitorUpdated('checked_in', $serialized, (int) $visitor->host_user_id));

        return $serialized;
    }

    /**
     * @return array<string, mixed>
     */
    public function respondVisitor(OfficeVisitor $visitor, User $actor, string $action, ?int $zoneId = null, ?string $note = null): array
    {
        $isAdmin = $actor->hasAnyRole([User::ROLE_FOUNDER, User::ROLE_OPERATIONS]) || $actor->can('organization.manage');
        if ((int) $visitor->host_user_id !== (int) $actor->id && ! $isAdmin) {
            abort(403, 'Hanya host tamu atau Admin yang dapat merespons tamu ini.');
        }

        DB::transaction(function () use ($visitor, $actor, $action, $zoneId, $note): void {
            if ($action === 'admit') {
                $targetZone = $zoneId
                    ? OfficeZone::query()->whereKey($zoneId)->where('is_active', true)->first()
                    : OfficeZone::query()->where('slug', 'reception')->first();

                $visitor->update([
                    'status' => 'admitted',
                    'admitted_at' => now(),
                    'zone_id' => $targetZone?->id ?? $visitor->zone_id,
                    'host_note' => $note ? strip_tags(trim($note)) : null,
                ]);

                OfficeEvent::create([
                    'type' => 'visitor_admitted',
                    'actor_id' => $actor->id,
                    'zone_id' => $visitor->zone_id,
                    'payload' => [
                        'visitor_id' => $visitor->id,
                        'visitor_name' => $visitor->name,
                    ],
                    'created_at' => now(),
                ]);
            } elseif ($action === 'delay') {
                $visitor->update([
                    'status' => 'delayed',
                    'host_note' => $note ? strip_tags(trim($note)) : 'Mohon tunggu sebentar.',
                ]);
            } elseif ($action === 'checkout') {
                $visitor->update([
                    'status' => 'checked_out',
                    'checked_out_at' => now(),
                ]);

                OfficeEvent::create([
                    'type' => 'visitor_checked_out',
                    'actor_id' => $actor->id,
                    'zone_id' => $visitor->zone_id,
                    'payload' => [
                        'visitor_id' => $visitor->id,
                        'visitor_name' => $visitor->name,
                    ],
                    'created_at' => now(),
                ]);
            }
        });

        $serialized = $this->serializeVisitor($visitor->fresh()->load(['company:id,name', 'contact:id,name', 'host:id,name', 'zone:id,slug,name']));
        event(new OfficeVisitorUpdated($action, $serialized, (int) $visitor->host_user_id));

        return $serialized;
    }

    /**
     * Real Project Room Kanban data from KDMS Projects + Task Tracker.
     *
     * @return array<string, mixed>
     */
    public function projectKanban(User $user, ?int $projectId = null): array
    {
        $canViewTasks = $user->can('tasks.view');
        $canViewProjects = $user->can('projects.view');

        $projects = $canViewProjects
            ? Project::query()
                ->where('status', '!=', 'Completed')
                ->orderBy('code')
                ->get(['id', 'code', 'name', 'status', 'target_end_date'])
            : collect();

        $selectedProject = $projectId
            ? $projects->firstWhere('id', $projectId)
            : $projects->first();

        $columns = [
            'todo' => [],
            'in_progress' => [],
            'review' => [],
            'done' => [],
        ];

        if ($canViewTasks) {
            $tasks = Task::query()
                ->with('pic:id,name')
                ->when($selectedProject !== null, fn ($q) => $q->where('project_id', $selectedProject->id))
                ->orderBy('kanban_order')
                ->orderBy('deadline')
                ->limit(40)
                ->get(['id', 'code', 'title', 'status', 'priority', 'deadline', 'pic_user_id', 'progress_pct']);

            foreach ($tasks as $t) {
                $item = [
                    'id' => $t->id,
                    'code' => $t->code,
                    'title' => $t->title,
                    'status' => $t->status,
                    'priority' => $t->priority,
                    'deadline' => $t->deadline?->format('Y-m-d'),
                    'pic_name' => $t->pic?->name ?? 'Unassigned',
                    'progress_pct' => (int) $t->progress_pct,
                ];

                if ($t->status === 'Not Started') {
                    $columns['todo'][] = $item;
                } elseif ($t->status === 'In Progress') {
                    $columns['in_progress'][] = $item;
                } elseif ($t->status === 'Under Review') {
                    $columns['review'][] = $item;
                } elseif ($t->status === 'Completed') {
                    $columns['done'][] = $item;
                }
            }
        }

        return [
            'can_view' => $canViewTasks,
            'selected_project' => $selectedProject ? [
                'id' => $selectedProject->id,
                'code' => $selectedProject->code,
                'name' => $selectedProject->name,
                'status' => $selectedProject->status,
                'progress_pct' => 0,
                'target_date' => $selectedProject->target_end_date?->format('Y-m-d'),
            ] : null,
            'projects' => $projects->map(fn (Project $p) => [
                'id' => $p->id,
                'code' => $p->code,
                'name' => $p->name,
            ])->values()->all(),
            'columns' => $columns,
        ];
    }

    /**
     * Send a coffee break invitation via DM and log event.
     *
     * @return array<string, mixed>
     */
    public function inviteCoffee(User $actor, User $target, ?string $note = null): array
    {
        if ($actor->id === $target->id) {
            throw ValidationException::withMessages([
                'target' => 'Pilih anggota lain untuk diajak ngopi.',
            ]);
        }

        $customNote = $note ? ' — "' . strip_tags(trim($note)) . '"' : '';
        $dm = $this->communicationService->sendMessage($actor, [
            'scope' => 'dm',
            'recipient_id' => $target->id,
            'body' => "☕ Yuk ngopi sebentar di Lounge Area!{$customNote}",
            'is_urgent' => false,
        ]);

        $lounge = OfficeZone::query()->where('slug', 'lounge')->first();
        OfficeEvent::create([
            'type' => 'coffee_invited',
            'actor_id' => $actor->id,
            'zone_id' => $lounge?->id,
            'payload' => [
                'target_user_id' => $target->id,
                'target_name' => $target->name,
            ],
            'created_at' => now(),
        ]);

        return ['message' => $dm];
    }

    /**
     * Activate 15-minute Break Time status and move to Lounge.
     */
    public function startBreakTime(User $user): OfficePresence
    {
        $this->presenceService->move($user, 'lounge');

        return $this->presenceService->updateStatus($user, [
            'status' => 'away',
            'custom_status_emoji' => '☕',
            'custom_status_text' => 'Break Time (15m)',
            'expires_in' => '30m',
            'zone_slug' => 'lounge',
        ]);
    }

    /**
     * Toggle Focus Mode (DND + 🎯 Focus Mode status).
     */
    public function toggleFocusMode(User $user, bool $enabled): OfficePresence
    {
        if ($enabled) {
            return $this->presenceService->updateStatus($user, [
                'status' => 'dnd',
                'custom_status_emoji' => '🎯',
                'custom_status_text' => 'Focus Mode',
                'expires_in' => '1h',
            ]);
        }

        return $this->presenceService->updateStatus($user, [
            'status' => 'available',
            'custom_status_emoji' => '💻',
            'custom_status_text' => null,
            'expires_in' => 'never',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function serializeVisitor(OfficeVisitor $v): array
    {
        return [
            'id' => $v->id,
            'name' => $v->name,
            'company_name' => $v->company_name ?? $v->company?->name,
            'company_id' => $v->company_id,
            'contact_id' => $v->contact_id,
            'purpose' => $v->purpose,
            'host_user_id' => $v->host_user_id,
            'host_name' => $v->host?->name ?? 'Host',
            'zone_id' => $v->zone_id,
            'zone_slug' => $v->zone?->slug ?? 'reception',
            'zone_name' => $v->zone?->name ?? 'Reception & Lobby',
            'status' => $v->status,
            'host_note' => $v->host_note,
            'checked_in_at' => $v->checked_in_at?->toIso8601String(),
            'checked_in_human' => $v->checked_in_at?->diffForHumans(),
            'expires_at' => $v->expires_at?->toIso8601String(),
        ];
    }
}

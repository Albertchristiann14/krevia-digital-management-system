<?php

namespace App\Domain\Crm\Services;

use App\Domain\Crm\Models\Lead;
use App\Domain\Project\Models\Project;
use App\Domain\Project\Models\ProjectMember;
use App\Domain\Project\Services\ProjectStageGateService;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ConvertWonLeadToProjectAction
{
    public function __construct(
        private readonly ProjectStageGateService $stageService,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Converts a Won opportunity into an active Project without duplicating Company or Contact.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function execute(Lead $lead, User $actor, array $attributes = []): Project
    {
        if ($lead->stage !== 'Won') {
            throw ValidationException::withMessages([
                'stage' => 'Only a Won opportunity can be converted into a project.',
            ]);
        }

        if ($lead->project()->exists()) {
            throw ValidationException::withMessages([
                'lead_id' => "Lead {$lead->code} has already been converted to a project.",
            ]);
        }

        $serviceLine = $attributes['service_line'] ?? $lead->service_line;
        if (! in_array($serviceLine, [Project::SERVICE_WEBSITE, Project::SERVICE_CUSTOM], true)) {
            throw ValidationException::withMessages([
                'service_line' => 'Select a valid service line (Website Development & CMS or Custom Software Development) before converting.',
            ]);
        }

        return DB::transaction(function () use ($lead, $actor, $attributes, $serviceLine): Project {
            $maxNum = Project::withTrashed()
                ->where('code', 'like', 'PRJ-%')
                ->pluck('code')
                ->map(fn (string $c) => (int) str_replace('PRJ-', '', $c))
                ->max() ?? 0;

            $nextCode = sprintf('PRJ-%03d', $maxNum + 1);

            $opsLead = User::role(User::ROLE_OPERATIONS)->first();
            $cto = User::role(User::ROLE_CTO)->first();

            $project = Project::create([
                'code' => $nextCode,
                'lead_id' => $lead->id,
                'company_id' => $lead->company_id,
                'primary_contact_id' => $lead->primary_contact_id,
                'name' => $attributes['name'] ?? "{$lead->company->name} — {$serviceLine}",
                'service_line' => $serviceLine,
                'scope_summary' => $attributes['scope_summary'] ?? $lead->potential_needs,
                'contract_ref' => $attributes['contract_ref'] ?? null,
                'contract_value' => $attributes['contract_value'] ?? $lead->estimated_value,
                'status' => 'Active',
                'start_date' => $attributes['start_date'] ?? now()->toDateString(),
                'target_end_date' => $attributes['target_end_date'] ?? null,
                'manager_user_id' => $attributes['manager_user_id'] ?? ($opsLead?->id ?? $actor->id),
                'tech_lead_user_id' => $attributes['tech_lead_user_id'] ?? ($cto?->id ?? $actor->id),
            ]);

            $this->stageService->seedStagesForProject($project);

            // Attach core delivery roles cleanly
            $defaultTeam = [
                [$lead->pic_user_id, 'Commercial Lead'],
                [$project->manager_user_id, 'Operations / Project Manager'],
                [$project->tech_lead_user_id, 'CTO / Technical Lead'],
            ];

            foreach ($defaultTeam as [$userId, $roleLabel]) {
                if ($userId) {
                    ProjectMember::firstOrCreate(
                        ['project_id' => $project->id, 'user_id' => $userId],
                        ['project_role' => $roleLabel]
                    );
                }
            }

            $this->audit->log(
                'project.converted_from_lead',
                "Converted Won lead {$lead->code} into Project {$project->code} ({$project->name}).",
                $project,
                ['lead_id' => $lead->id],
                ['company_id' => $project->company_id, 'service_line' => $serviceLine],
                $actor->id
            );

            return $project;
        });
    }
}

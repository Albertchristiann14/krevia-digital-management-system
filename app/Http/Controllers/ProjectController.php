<?php

namespace App\Http\Controllers;

use App\Domain\Crm\Models\Company;
use App\Domain\Project\Models\HandoverRecord;
use App\Domain\Project\Models\MaintenanceTicket;
use App\Domain\Project\Models\Milestone;
use App\Domain\Project\Models\Project;
use App\Domain\Project\Models\ProjectMember;
use App\Domain\Project\Models\ProjectStage;
use App\Domain\Project\Models\QaReport;
use App\Domain\Project\Models\Release;
use App\Domain\Project\Models\Requirement;
use App\Domain\Project\Models\UatRecord;
use App\Domain\Project\Services\ProjectStageGateService;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Project::class);

        $query = Project::query()
            ->with([
                'company:id,name,industry',
                'manager:id,name',
                'techLead:id,name',
                'stages:id,project_id,stage_order,name,status',
            ])
            ->withCount(['requirements', 'maintenanceTickets']);

        if ($serviceLine = $request->string('service_line')->trim()->toString()) {
            $query->where('service_line', $serviceLine);
        }

        $projects = $query->latest('id')->get();
        $companies = Company::query()->orderBy('name')->get(['id', 'name']);
        $users = User::query()->where('is_active', true)->orderBy('id')->get(['id', 'name']);

        return Inertia::render('Projects/Index', [
            'projects' => $projects->map(function (Project $p) {
                $totalStages = $p->stages->count();
                $completedStages = $p->stages->where('status', 'Completed')->count();
                $currentStage = $p->stages->firstWhere('status', '!=', 'Completed');

                return [
                    'id' => $p->id,
                    'code' => $p->code,
                    'name' => $p->name,
                    'company_name' => $p->company?->name,
                    'service_line' => $p->service_line,
                    'status' => $p->status,
                    'start_date' => $p->start_date?->format('Y-m-d'),
                    'target_end_date' => $p->target_end_date?->format('Y-m-d'),
                    'manager_name' => $p->manager?->name,
                    'tech_lead_name' => $p->techLead?->name,
                    'total_stages' => $totalStages,
                    'completed_stages' => $completedStages,
                    'current_stage_name' => $currentStage?->name ?? 'Maintenance',
                    'requirements_count' => $p->requirements_count,
                    'tickets_count' => $p->maintenance_tickets_count,
                ];
            }),
            'companies' => $companies,
            'users' => $users,
            'serviceLines' => [Project::SERVICE_WEBSITE, Project::SERVICE_CUSTOM],
            'canCreate' => $request->user()?->can('create', Project::class) ?? false,
        ]);
    }

    public function store(
        Request $request,
        ProjectStageGateService $stageService,
        AuditLogger $audit
    ): RedirectResponse {
        $this->authorize('create', Project::class);

        $data = $request->validate([
            'company_id' => ['required', 'exists:companies,id'],
            'name' => ['required', 'string', 'max:255'],
            'service_line' => ['required', Rule::in([Project::SERVICE_WEBSITE, Project::SERVICE_CUSTOM])],
            'scope_summary' => ['nullable', 'string', 'max:3000'],
            'start_date' => ['nullable', 'date'],
            'target_end_date' => ['nullable', 'date'],
            'manager_user_id' => ['required', 'exists:users,id'],
            'tech_lead_user_id' => ['required', 'exists:users,id'],
        ]);

        $project = DB::transaction(function () use ($data, $stageService, $audit, $request): Project {
            $maxNum = Project::withTrashed()
                ->where('code', 'like', 'PRJ-%')
                ->pluck('code')
                ->map(fn (string $c) => (int) str_replace('PRJ-', '', $c))
                ->max() ?? 0;

            $project = Project::create([
                'code' => sprintf('PRJ-%03d', $maxNum + 1),
                ...$data,
                'status' => 'Active',
            ]);

            $stageService->seedStagesForProject($project);

            ProjectMember::firstOrCreate(
                ['project_id' => $project->id, 'user_id' => $data['manager_user_id']],
                ['project_role' => 'Operations / Project Manager']
            );
            ProjectMember::firstOrCreate(
                ['project_id' => $project->id, 'user_id' => $data['tech_lead_user_id']],
                ['project_role' => 'CTO / Technical Lead']
            );

            $audit->log('project.created', "Created project {$project->code}: {$project->name}.", $project, null, null, $request->user()->id);

            return $project;
        });

        return redirect()->route('projects.show', $project)->with('success', "Project {$project->code} created.");
    }

    public function show(Request $request, Project $project): Response
    {
        $this->authorize('view', $project);

        $project->load([
            'company',
            'primaryContact',
            'lead:id,code',
            'manager:id,name',
            'techLead:id,name',
            'members.user:id,name',
            'stages.pic:id,name',
            'stages.approver:id,name',
            'milestones',
            'requirements.acceptanceCriteria',
            'qaReports.tester:id,name',
            'uatRecords.recorder:id,name',
            'releases.deployer:id,name',
            'handoverRecord',
            'maintenanceTickets.assignee:id,name',
            'tasks.pic:id,name',
        ]);

        $users = User::query()->where('is_active', true)->orderBy('id')->get(['id', 'name']);

        return Inertia::render('Projects/Show', [
            'project' => [
                'id' => $project->id,
                'code' => $project->code,
                'name' => $project->name,
                'service_line' => $project->service_line,
                'scope_summary' => $project->scope_summary,
                'contract_ref' => $project->contract_ref,
                'contract_value' => $project->contract_value !== null ? (float) $project->contract_value : null,
                'status' => $project->status,
                'start_date' => $project->start_date?->format('Y-m-d'),
                'target_end_date' => $project->target_end_date?->format('Y-m-d'),
                'lead_code' => $project->lead?->code,
                'company' => $project->company,
                'primary_contact' => $project->primaryContact,
                'manager_name' => $project->manager?->name,
                'tech_lead_name' => $project->techLead?->name,
                'members' => $project->members->map(fn ($m) => [
                    'id' => $m->id,
                    'user_id' => $m->user_id,
                    'name' => $m->user?->name,
                    'project_role' => $m->project_role,
                ]),
                'stages' => $project->stages->map(fn (ProjectStage $s) => [
                    'id' => $s->id,
                    'stage_order' => $s->stage_order,
                    'name' => $s->name,
                    'purpose' => $s->purpose,
                    'output_label' => $s->output_label,
                    'completion_criteria' => $s->completion_criteria,
                    'pic_name' => $s->pic?->name,
                    'status' => $s->status,
                    'completion_evidence_note' => $s->completion_evidence_note,
                    'completed_at' => $s->completed_at?->format('Y-m-d H:i'),
                    'approver_name' => $s->approver?->name,
                ]),
                'milestones' => $project->milestones->map(fn ($ms) => [
                    'id' => $ms->id,
                    'title' => $ms->title,
                    'due_date' => $ms->due_date?->format('Y-m-d'),
                    'status' => $ms->status,
                ]),
                'requirements' => $project->requirements->map(fn ($req) => [
                    'id' => $req->id,
                    'code' => $req->code,
                    'title' => $req->title,
                    'description' => $req->description,
                    'priority' => $req->priority,
                    'status' => $req->status,
                    'approved_by_client_name' => $req->approved_by_client_name,
                    'acceptance_criteria' => $req->acceptanceCriteria->map(fn ($ac) => [
                        'id' => $ac->id,
                        'description' => $ac->description,
                        'is_passed' => $ac->is_passed,
                    ]),
                ]),
                'qa_reports' => $project->qaReports->map(fn ($qa) => [
                    'id' => $qa->id,
                    'title' => $qa->title,
                    'environment' => $qa->environment,
                    'critical_bugs' => $qa->critical_bugs,
                    'high_bugs' => $qa->high_bugs,
                    'medium_bugs' => $qa->medium_bugs,
                    'status' => $qa->status,
                    'tester' => $qa->tester?->name,
                    'tested_at' => $qa->tested_at?->format('Y-m-d H:i'),
                ]),
                'uat_records' => $project->uatRecords->map(fn ($uat) => [
                    'id' => $uat->id,
                    'title' => $uat->title,
                    'tester_name' => $uat->tester_name,
                    'status' => $uat->status,
                    'feedback' => $uat->feedback,
                    'signed_off_at' => $uat->signed_off_at?->format('Y-m-d'),
                ]),
                'releases' => $project->releases->map(fn ($rel) => [
                    'id' => $rel->id,
                    'version' => $rel->version,
                    'environment' => $rel->environment,
                    'has_backup' => $rel->has_backup,
                    'has_rollback_plan' => $rel->has_rollback_plan,
                    'status' => $rel->status,
                    'deployer' => $rel->deployer?->name,
                    'deployed_at' => $rel->deployed_at?->format('Y-m-d H:i'),
                ]),
                'handover_record' => $project->handoverRecord ? [
                    'id' => $project->handoverRecord->id,
                    'handover_date' => $project->handoverRecord->handover_date?->format('Y-m-d'),
                    'signed_by_client' => $project->handoverRecord->signed_by_client,
                    'access_transferred' => $project->handoverRecord->access_transferred,
                    'guide_delivered' => $project->handoverRecord->guide_delivered,
                ] : null,
                'maintenance_tickets' => $project->maintenanceTickets->map(fn ($tk) => [
                    'id' => $tk->id,
                    'code' => $tk->code,
                    'title' => $tk->title,
                    'priority' => $tk->priority,
                    'status' => $tk->status,
                    'assignee' => $tk->assignee?->name,
                ]),
                'tasks' => $project->tasks->map(fn ($t) => [
                    'id' => $t->id,
                    'code' => $t->code,
                    'title' => $t->title,
                    'pic_name' => $t->pic?->name,
                    'status' => $t->status,
                    'deadline' => $t->deadline?->format('Y-m-d'),
                ]),
            ],
            'dodChecklist' => ProjectStageGateService::DOD_CHECKLIST,
            'users' => $users,
            'canUpdate' => $request->user()?->can('update', $project) ?? false,
        ]);
    }

    public function completeStage(
        Request $request,
        Project $project,
        ProjectStage $stage,
        ProjectStageGateService $service
    ): RedirectResponse {
        $this->authorize('update', $project);
        abort_unless($stage->project_id === $project->id, 404);

        $data = $request->validate([
            'completion_evidence_note' => ['required', 'string', 'max:2000'],
        ]);

        $service->completeStage($stage, $request->user(), $data['completion_evidence_note']);

        return back()->with('success', "Stage '{$stage->name}' completed and next stage unlocked.");
    }

    public function storeRequirement(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'priority' => ['required', Rule::in(['Tinggi', 'Sedang', 'Rendah'])],
            'status' => ['required', Rule::in(['Draft', 'Client Approved', 'Implemented', 'Verified'])],
            'approved_by_client_name' => ['nullable', 'string', 'max:150'],
            'acceptance_criterion' => ['nullable', 'string', 'max:500'],
        ]);

        $req = Requirement::create([
            'project_id' => $project->id,
            'code' => sprintf('REQ-%02d', $project->requirements()->count() + 1),
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'priority' => $data['priority'],
            'status' => $data['status'],
            'client_approved_at' => $data['status'] === 'Client Approved' ? now() : null,
            'approved_by_client_name' => $data['approved_by_client_name'] ?? null,
        ]);

        if (! empty($data['acceptance_criterion'])) {
            $req->acceptanceCriteria()->create([
                'description' => $data['acceptance_criterion'],
            ]);
        }

        return back()->with('success', "Requirement {$req->code} added.");
    }

    public function storeQaReport(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'environment' => ['required', Rule::in(['staging', 'production'])],
            'critical_bugs' => ['required', 'integer', 'min:0'],
            'high_bugs' => ['required', 'integer', 'min:0'],
            'medium_bugs' => ['required', 'integer', 'min:0'],
            'status' => ['required', Rule::in(['Pending', 'Passed', 'Failed'])],
        ]);

        if ($data['status'] === 'Passed' && ($data['critical_bugs'] > 0 || $data['high_bugs'] > 0)) {
            return back()->withErrors(['status' => 'QA Report cannot be marked Passed while critical or high bugs remain open.']);
        }

        QaReport::create([
            'project_id' => $project->id,
            ...$data,
            'tested_by' => $request->user()->id,
            'approved_by' => $request->user()->isCto() ? $request->user()->id : null,
            'tested_at' => now(),
        ]);

        return back()->with('success', 'QA Report logged.');
    }

    public function storeUat(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'tester_name' => ['required', 'string', 'max:150'],
            'status' => ['required', Rule::in(['Pending', 'Approved', 'Revisions Needed'])],
            'feedback' => ['nullable', 'string', 'max:2000'],
        ]);

        UatRecord::create([
            'project_id' => $project->id,
            ...$data,
            'signed_off_at' => $data['status'] === 'Approved' ? now() : null,
            'recorded_by' => $request->user()->id,
        ]);

        return back()->with('success', 'UAT Record saved.');
    }

    public function storeRelease(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'version' => ['required', 'string', 'max:40'],
            'environment' => ['required', Rule::in(['staging', 'production'])],
            'has_backup' => ['required', 'boolean'],
            'has_rollback_plan' => ['required', 'boolean'],
            'rollback_notes' => ['nullable', 'string', 'max:2000'],
            'release_notes' => ['nullable', 'string', 'max:2000'],
            'status' => ['required', Rule::in(['Planned', 'Live', 'Rolled Back'])],
        ]);

        Release::create([
            'project_id' => $project->id,
            ...$data,
            'deployed_by' => $request->user()->id,
            'deployed_at' => now(),
        ]);

        return back()->with('success', "Release {$data['version']} logged.");
    }

    public function storeHandover(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'handover_date' => ['required', 'date'],
            'signed_by_client' => ['required', 'string', 'max:150'],
            'trained_users_summary' => ['nullable', 'string', 'max:2000'],
            'access_transferred' => ['required', 'boolean'],
            'guide_delivered' => ['required', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        HandoverRecord::create([
            'project_id' => $project->id,
            ...$data,
            'recorded_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Handover record saved.');
    }

    public function storeTicket(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'priority' => ['required', Rule::in(['Tinggi', 'Sedang', 'Rendah'])],
            'assigned_to' => ['nullable', 'exists:users,id'],
        ]);

        MaintenanceTicket::create([
            'project_id' => $project->id,
            'code' => sprintf('MNT-%03d', MaintenanceTicket::count() + 1),
            ...$data,
            'status' => 'Open',
        ]);

        return back()->with('success', 'Maintenance ticket opened.');
    }

    public function storeMilestone(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'due_date' => ['nullable', 'date'],
        ]);

        Milestone::create(['project_id' => $project->id, ...$data]);

        return back()->with('success', 'Milestone added.');
    }
}

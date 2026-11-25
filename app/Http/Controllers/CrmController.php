<?php

namespace App\Http\Controllers;

use App\Domain\Crm\Models\Company;
use App\Domain\Crm\Models\Contact;
use App\Domain\Crm\Models\FollowUp;
use App\Domain\Crm\Models\Lead;
use App\Domain\Crm\Models\LeadInteraction;
use App\Domain\Crm\Models\PipelineHistory;
use App\Domain\Crm\Models\Proposal;
use App\Domain\Crm\Models\Quotation;
use App\Domain\Crm\Services\ConvertWonLeadToProjectAction;
use App\Domain\Crm\Services\LeadPipelineService;
use App\Domain\Project\Models\Project;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CrmController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Lead::class);

        $query = Lead::query()
            ->with([
                'company:id,name,industry,location,phone,email,website',
                'primaryContact:id,name,role_title,email,phone,is_decision_maker',
                'pic:id,name',
                'project:id,lead_id,code,name',
            ]);

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('potential_needs', 'like', "%{$search}%")
                    ->orWhereHas('company', fn ($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }

        if ($stage = $request->string('stage')->trim()->toString()) {
            $query->where('stage', $stage);
        }

        if ($industry = $request->string('industry')->trim()->toString()) {
            $query->whereHas('company', fn ($cq) => $cq->where('industry', $industry));
        }

        if ($serviceLine = $request->string('service_line')->trim()->toString()) {
            $query->where('service_line', $serviceLine);
        }

        $leads = $query->orderBy('external_no')->orderBy('id')->get();

        $stageCounts = collect(Lead::STAGES)->mapWithKeys(
            fn (string $s) => [$s => $leads->where('stage', $s)->count()]
        );

        $users = User::query()->where('is_active', true)->orderBy('id')->get(['id', 'name']);

        return Inertia::render('Crm/Index', [
            'viewMode' => $request->string('view', 'kanban')->toString(),
            'leads' => $leads->map(fn (Lead $l) => [
                'id' => $l->id,
                'code' => $l->code,
                'company_id' => $l->company_id,
                'company_name' => $l->company?->name,
                'industry' => $l->company?->industry,
                'website' => $l->company?->website,
                'contact_name' => $l->primaryContact?->name,
                'contact_role' => $l->primaryContact?->role_title,
                'contact_phone' => $l->primaryContact?->phone ?? $l->company?->phone,
                'contact_email' => $l->primaryContact?->email ?? $l->company?->email,
                'potential_needs' => $l->potential_needs,
                'service_line' => $l->service_line,
                'source' => $l->source,
                'stage' => $l->stage,
                'pic_user_id' => $l->pic_user_id,
                'pic_name' => $l->pic?->name,
                'contacted_at' => $l->contacted_at?->format('Y-m-d'),
                'next_follow_up_at' => $l->next_follow_up_at?->format('Y-m-d'),
                'estimated_value' => $l->estimated_value !== null ? (float) $l->estimated_value : null,
                'discovery_meeting_at' => $l->discovery_meeting_at?->format('Y-m-d'),
                'proposal_sent_at' => $l->proposal_sent_at?->format('Y-m-d'),
                'closed_at' => $l->closed_at?->format('Y-m-d'),
                'data_status' => $l->data_status,
                'follow_up_overdue' => $l->isFollowUpOverdue(),
                'converted_project' => $l->project ? [
                    'id' => $l->project->id,
                    'code' => $l->project->code,
                ] : null,
            ]),
            'stageCounts' => $stageCounts,
            'stages' => Lead::STAGES,
            'industries' => Company::INDUSTRIES,
            'serviceLines' => Lead::SERVICE_LINES,
            'users' => $users,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'stage' => $request->string('stage')->toString(),
                'industry' => $request->string('industry')->toString(),
                'service_line' => $request->string('service_line')->toString(),
            ],
            'canCreate' => $request->user()?->can('create', Lead::class) ?? false,
        ]);
    }

    public function companies(Request $request): Response
    {
        $this->authorize('viewAny', Lead::class);

        $companies = Company::query()
            ->with(['contacts', 'leads:id,company_id,code,stage', 'projects:id,company_id,code,name,status'])
            ->orderBy('name')
            ->get();

        return Inertia::render('Crm/Companies', [
            'companies' => $companies->map(fn (Company $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'industry' => $c->industry,
                'location' => $c->location,
                'phone' => $c->phone,
                'email' => $c->email,
                'website' => $c->website,
                'contacts' => $c->contacts->map(fn (Contact $ct) => [
                    'id' => $ct->id,
                    'name' => $ct->name,
                    'role_title' => $ct->role_title,
                    'email' => $ct->email,
                    'phone' => $ct->phone,
                    'is_decision_maker' => $ct->is_decision_maker,
                ]),
                'leads_count' => $c->leads->count(),
                'projects_count' => $c->projects->count(),
            ]),
            'industries' => Company::INDUSTRIES,
            'canCreate' => $request->user()?->can('create', Lead::class) ?? false,
        ]);
    }

    public function show(Request $request, Lead $lead): Response
    {
        $this->authorize('view', $lead);

        $lead->load([
            'company.contacts',
            'primaryContact',
            'pic:id,name',
            'project:id,lead_id,code,name,status',
            'pipelineHistories.actor:id,name',
            'interactions.user:id,name',
            'followUps.assignee:id,name',
            'proposals.creator:id,name',
            'quotations',
        ]);

        $users = User::query()->where('is_active', true)->orderBy('id')->get(['id', 'name']);

        return Inertia::render('Crm/Show', [
            'lead' => [
                'id' => $lead->id,
                'code' => $lead->code,
                'company' => [
                    'id' => $lead->company->id,
                    'name' => $lead->company->name,
                    'industry' => $lead->company->industry,
                    'location' => $lead->company->location,
                    'phone' => $lead->company->phone,
                    'email' => $lead->company->email,
                    'website' => $lead->company->website,
                    'contacts' => $lead->company->contacts,
                ],
                'primary_contact_id' => $lead->primary_contact_id,
                'potential_needs' => $lead->potential_needs,
                'service_line' => $lead->service_line,
                'source' => $lead->source,
                'stage' => $lead->stage,
                'pic_user_id' => $lead->pic_user_id,
                'pic_name' => $lead->pic?->name,
                'contacted_at' => $lead->contacted_at?->format('Y-m-d'),
                'next_follow_up_at' => $lead->next_follow_up_at?->format('Y-m-d'),
                'estimated_value' => $lead->estimated_value !== null ? (float) $lead->estimated_value : null,
                'discovery_meeting_at' => $lead->discovery_meeting_at?->format('Y-m-d'),
                'proposal_sent_at' => $lead->proposal_sent_at?->format('Y-m-d'),
                'closed_at' => $lead->closed_at?->format('Y-m-d'),
                'lost_reason' => $lead->lost_reason,
                'data_status' => $lead->data_status,
                'notes' => $lead->notes,
                'project' => $lead->project,
                'histories' => $lead->pipelineHistories->map(fn ($h) => [
                    'id' => $h->id,
                    'from_stage' => $h->from_stage,
                    'to_stage' => $h->to_stage,
                    'actor' => $h->actor?->name ?? 'System',
                    'evidence_note' => $h->evidence_note,
                    'changed_at' => $h->changed_at?->format('Y-m-d H:i'),
                ]),
                'interactions' => $lead->interactions->map(fn ($i) => [
                    'id' => $i->id,
                    'channel' => $i->channel,
                    'summary' => $i->summary,
                    'outcome' => $i->outcome,
                    'author' => $i->user?->name,
                    'occurred_at' => $i->occurred_at?->format('Y-m-d H:i'),
                ]),
                'follow_ups' => $lead->followUps->map(fn ($f) => [
                    'id' => $f->id,
                    'due_at' => $f->due_at?->format('Y-m-d'),
                    'note' => $f->note,
                    'status' => $f->status,
                    'assignee' => $f->assignee?->name,
                ]),
                'proposals' => $lead->proposals->map(fn ($p) => [
                    'id' => $p->id,
                    'code' => $p->code,
                    'version' => $p->version,
                    'title' => $p->title,
                    'scope_summary' => $p->scope_summary,
                    'estimated_hours' => $p->estimated_hours,
                    'total_value' => $p->total_value !== null ? (float) $p->total_value : null,
                    'is_price_approved' => $p->is_price_approved,
                    'status' => $p->status,
                    'sent_at' => $p->sent_at?->format('Y-m-d'),
                ]),
                'quotations' => $lead->quotations->map(fn ($q) => [
                    'id' => $q->id,
                    'code' => $q->code,
                    'total_amount' => $q->total_amount !== null ? (float) $q->total_amount : null,
                    'valid_until' => $q->valid_until?->format('Y-m-d'),
                    'status' => $q->status,
                ]),
            ],
            'stages' => Lead::STAGES,
            'serviceLines' => Lead::SERVICE_LINES,
            'projectServiceLines' => [Project::SERVICE_WEBSITE, Project::SERVICE_CUSTOM],
            'users' => $users,
            'permissions' => [
                'canUpdate' => $request->user()?->can('update', $lead) ?? false,
                'canConvert' => $request->user()?->can('convertToProject', $lead) ?? false,
                'canDelete' => $request->user()?->can('delete', $lead) ?? false,
            ],
        ]);
    }

    public function store(Request $request, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('create', Lead::class);

        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:200'],
            'industry' => ['required', Rule::in(Company::INDUSTRIES)],
            'location' => ['nullable', 'string', 'max:150'],
            'website' => ['nullable', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:150'],
            'contact_role' => ['nullable', 'string', 'max:150'],
            'contact_email' => ['nullable', 'string', 'max:200'],
            'contact_phone' => ['nullable', 'string', 'max:100'],
            'potential_needs' => ['nullable', 'string', 'max:1000'],
            'service_line' => ['required', Rule::in(Lead::SERVICE_LINES)],
            'source' => ['nullable', 'string', 'max:120'],
            'pic_user_id' => ['required', 'exists:users,id'],
            'estimated_value' => ['nullable', 'numeric', 'min:0'],
        ]);

        $lead = DB::transaction(function () use ($data, $request, $audit): Lead {
            $company = Company::firstOrCreate(
                ['name' => $data['company_name']],
                [
                    'industry' => $data['industry'],
                    'location' => $data['location'] ?? 'Pekanbaru',
                    'website' => $data['website'] ?? null,
                    'email' => $data['contact_email'] ?? null,
                    'phone' => $data['contact_phone'] ?? null,
                ]
            );

            $contact = null;
            if (! empty($data['contact_name'])) {
                $contact = Contact::create([
                    'company_id' => $company->id,
                    'name' => $data['contact_name'],
                    'role_title' => $data['contact_role'] ?? null,
                    'email' => $data['contact_email'] ?? null,
                    'phone' => $data['contact_phone'] ?? null,
                    'is_decision_maker' => true,
                ]);
            }

            $maxNo = (Lead::withTrashed()->max('external_no') ?? 55) + 1;
            $code = sprintf('L-%03d', $maxNo);

            $lead = Lead::create([
                'code' => $code,
                'external_no' => $maxNo,
                'company_id' => $company->id,
                'primary_contact_id' => $contact?->id,
                'potential_needs' => $data['potential_needs'] ?? null,
                'service_line' => $data['service_line'],
                'source' => $data['source'] ?? 'Outreach',
                'stage' => 'Lead Identified',
                'pic_user_id' => $data['pic_user_id'],
                'estimated_value' => $data['estimated_value'] ?? null,
                'data_status' => 'Disepakati',
            ]);

            PipelineHistory::create([
                'lead_id' => $lead->id,
                'from_stage' => null,
                'to_stage' => 'Lead Identified',
                'changed_by' => $request->user()->id,
                'evidence_note' => 'Prospect created in KDMS',
                'changed_at' => now(),
            ]);

            $audit->log('crm.lead_created', "Created prospect {$lead->code} ({$company->name}).", $lead);

            return $lead;
        });

        return redirect()->route('crm.leads.show', $lead)->with('success', "Prospect {$lead->code} added.");
    }

    public function update(Request $request, Lead $lead, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('update', $lead);

        $data = $request->validate([
            'potential_needs' => ['nullable', 'string', 'max:1000'],
            'service_line' => ['required', Rule::in(Lead::SERVICE_LINES)],
            'pic_user_id' => ['required', 'exists:users,id'],
            'estimated_value' => ['nullable', 'numeric', 'min:0'],
            'next_follow_up_at' => ['nullable', 'date'],
            'data_status' => ['required', Rule::in(['Disepakati', 'Usulan', 'Perlu Konfirmasi Manajemen'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $old = $lead->only(array_keys($data));
        $lead->update($data);
        $audit->log('crm.lead_updated', "Updated prospect {$lead->code}.", $lead, $old, $data);

        return back()->with('success', "Prospect {$lead->code} updated.");
    }

    public function transitionStage(
        Request $request,
        Lead $lead,
        LeadPipelineService $service
    ): RedirectResponse {
        $this->authorize('update', $lead);

        $data = $request->validate([
            'stage' => ['required', Rule::in(Lead::STAGES)],
            'evidence_note' => ['nullable', 'string', 'max:1000'],
            'lost_reason' => ['nullable', 'string', 'max:1000'],
            'next_follow_up_at' => ['nullable', 'date'],
            'event_date' => ['nullable', 'date'],
        ]);

        $service->transitionStage($lead, $data['stage'], $request->user(), $data);

        return back()->with('success', "Prospect {$lead->code} moved to {$data['stage']}.");
    }

    public function storeInteraction(Request $request, Lead $lead): RedirectResponse
    {
        $this->authorize('update', $lead);

        $data = $request->validate([
            'channel' => ['required', Rule::in(['Email', 'WhatsApp', 'Call', 'Meeting', 'Visit'])],
            'summary' => ['required', 'string', 'max:2000'],
            'outcome' => ['nullable', 'string', 'max:1000'],
        ]);

        LeadInteraction::create([
            'lead_id' => $lead->id,
            'user_id' => $request->user()->id,
            'channel' => $data['channel'],
            'summary' => $data['summary'],
            'outcome' => $data['outcome'] ?? null,
            'occurred_at' => now(),
        ]);

        return back()->with('success', 'Interaction logged.');
    }

    public function storeFollowUp(Request $request, Lead $lead): RedirectResponse
    {
        $this->authorize('update', $lead);

        $data = $request->validate([
            'due_at' => ['required', 'date'],
            'assigned_to' => ['required', 'exists:users,id'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        FollowUp::create([
            'lead_id' => $lead->id,
            'assigned_to' => $data['assigned_to'],
            'due_at' => $data['due_at'],
            'note' => $data['note'] ?? null,
            'status' => 'Pending',
        ]);

        $lead->update(['next_follow_up_at' => $data['due_at']]);

        return back()->with('success', 'Follow-up reminder scheduled.');
    }

    public function completeFollowUp(Lead $lead, FollowUp $followUp): RedirectResponse
    {
        $this->authorize('update', $lead);
        abort_unless($followUp->lead_id === $lead->id, 404);

        $followUp->update([
            'status' => 'Completed',
            'completed_at' => now(),
        ]);

        return back()->with('success', 'Follow-up marked complete.');
    }

    public function storeProposal(Request $request, Lead $lead, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('update', $lead);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'scope_summary' => ['nullable', 'string', 'max:3000'],
            'estimated_hours' => ['nullable', 'integer', 'min:1'],
            'total_value' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['Draft', 'Sent', 'Under Negotiation', 'Accepted', 'Rejected'])],
        ]);

        $count = Proposal::count() + 1;
        $proposal = Proposal::create([
            'lead_id' => $lead->id,
            'code' => sprintf('PRP-%03d', $count),
            'title' => $data['title'],
            'scope_summary' => $data['scope_summary'] ?? null,
            'estimated_hours' => $data['estimated_hours'] ?? null,
            'total_value' => $data['total_value'] ?? null,
            'is_price_approved' => $request->user()->isManagingDirector(),
            'status' => $data['status'],
            'sent_at' => $data['status'] === 'Sent' ? now()->toDateString() : null,
            'created_by' => $request->user()->id,
            'approved_by' => $request->user()->isManagingDirector() ? $request->user()->id : null,
        ]);

        if (isset($data['total_value'])) {
            Quotation::create([
                'lead_id' => $lead->id,
                'proposal_id' => $proposal->id,
                'code' => sprintf('QT-%03d', Quotation::count() + 1),
                'total_amount' => $data['total_value'],
                'valid_until' => now()->addDays(14)->toDateString(),
                'status' => $data['status'] === 'Sent' ? 'Sent' : 'Draft',
                'created_by' => $request->user()->id,
            ]);
            $lead->update(['estimated_value' => $data['total_value']]);
        }

        $audit->log('crm.proposal_created', "Created proposal {$proposal->code} for {$lead->code}.", $proposal);

        return back()->with('success', "Proposal {$proposal->code} created.");
    }

    public function convertToProject(
        Request $request,
        Lead $lead,
        ConvertWonLeadToProjectAction $action
    ): RedirectResponse {
        $this->authorize('convertToProject', $lead);

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'service_line' => ['required', Rule::in([Project::SERVICE_WEBSITE, Project::SERVICE_CUSTOM])],
            'contract_value' => ['nullable', 'numeric', 'min:0'],
            'start_date' => ['nullable', 'date'],
            'target_end_date' => ['nullable', 'date'],
        ]);

        $project = $action->execute($lead, $request->user(), $data);

        return redirect()
            ->route('projects.show', $project)
            ->with('success', "Converted {$lead->code} into Project {$project->code} without duplicating client data.");
    }
}

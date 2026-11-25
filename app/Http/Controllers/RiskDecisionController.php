<?php

namespace App\Http\Controllers;

use App\Domain\Governance\Models\Decision;
use App\Domain\Governance\Models\Risk;
use App\Domain\Governance\Services\RiskAndDecisionService;
use App\Domain\Shared\Services\ReferenceCacheService;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RiskDecisionController extends Controller
{
    public function index(Request $request, ReferenceCacheService $refs): Response
    {
        $this->authorize('viewRisks', Risk::class);

        $risks = Risk::query()
            ->with(['pic:id,name', 'reviews.reviewer:id,name'])
            ->orderByDesc('score')
            ->orderBy('code')
            ->get();

        $decisions = Decision::query()
            ->with(['pic:id,name', 'approver:id,name', 'sourceMeeting:id,code'])
            ->orderBy('code')
            ->get();

        $users = $refs->activeUsers();

        return Inertia::render('Governance/RisksAndDecisions', [
            'risks' => $risks->map(fn (Risk $r) => [
                'id' => $r->id,
                'code' => $r->code,
                'category' => $r->category,
                'title' => $r->title,
                'likelihood' => $r->likelihood,
                'impact' => $r->impact,
                'score' => $r->score,
                'level' => $r->level,
                'pic_user_id' => $r->pic_user_id,
                'pic_name' => $r->pic?->name,
                'mitigation_plan' => $r->mitigation_plan,
                'contingency_plan' => $r->contingency_plan,
                'status' => $r->status,
                'last_reviewed_at' => $r->last_reviewed_at?->format('Y-m-d'),
                'reviews' => $r->reviews->map(fn ($rv) => [
                    'id' => $rv->id,
                    'score' => $rv->score,
                    'level' => $rv->level,
                    'reviewer' => $rv->reviewer?->name,
                    'notes' => $rv->notes,
                    'reviewed_at' => $rv->reviewed_at?->format('Y-m-d H:i'),
                ]),
            ]),
            'decisions' => $decisions->map(fn (Decision $d) => [
                'id' => $d->id,
                'code' => $d->code,
                'decision_date' => $d->decision_date?->format('Y-m-d'),
                'topic_decision' => $d->topic_decision,
                'deadline' => $d->deadline?->format('Y-m-d'),
                'status' => $d->status,
                'pic_user_id' => $d->pic_user_id,
                'pic_name' => $d->pic?->name,
                'follow_up' => $d->follow_up,
                'data_status' => $d->data_status,
                'approver_name' => $d->approver?->name,
                'source_meeting_code' => $d->sourceMeeting?->code,
            ]),
            'categories' => Risk::CATEGORIES,
            'riskStatuses' => Risk::STATUSES,
            'decisionStatuses' => Decision::STATUSES,
            'users' => $users,
            'permissions' => [
                'canManageRisks' => $request->user()?->can('manageRisks', Risk::class) ?? false,
                'canCreateDecisions' => $request->user()?->can('createDecisions', Risk::class) ?? false,
                'canApproveDecisions' => $request->user()?->can('approveDecisions', Risk::class) ?? false,
            ],
        ]);
    }

    public function storeRisk(Request $request, RiskAndDecisionService $service): RedirectResponse
    {
        $this->authorize('manageRisks', Risk::class);

        $data = $request->validate([
            'category' => ['required', Rule::in(Risk::CATEGORIES)],
            'title' => ['required', 'string', 'max:1000'],
            'likelihood' => ['required', 'integer', 'min:1', 'max:5'],
            'impact' => ['required', 'integer', 'min:1', 'max:5'],
            'pic_user_id' => ['required', 'exists:users,id'],
            'mitigation_plan' => ['required', 'string', 'max:2000'],
            'contingency_plan' => ['nullable', 'string', 'max:2000'],
        ]);

        $risk = $service->createOrUpdateRisk($data, $request->user());

        return back()->with('success', "Risk {$risk->code} recorded.");
    }

    public function reviewRisk(Request $request, Risk $risk, RiskAndDecisionService $service): RedirectResponse
    {
        $this->authorize('manageRisks', Risk::class);

        $data = $request->validate([
            'likelihood' => ['required', 'integer', 'min:1', 'max:5'],
            'impact' => ['required', 'integer', 'min:1', 'max:5'],
            'status' => ['required', Rule::in(Risk::STATUSES)],
            'notes' => ['nullable', 'string', 'max:1500'],
        ]);

        $service->reviewRisk($risk, (int) $data['likelihood'], (int) $data['impact'], $data['status'], $data['notes'] ?? null, $request->user());

        return back()->with('success', "Risk {$risk->code} reviewed.");
    }

    public function storeDecision(Request $request, RiskAndDecisionService $service): RedirectResponse
    {
        $this->authorize('createDecisions', Risk::class);

        $data = $request->validate([
            'topic_decision' => ['required', 'string', 'max:2000'],
            'decision_date' => ['nullable', 'date'],
            'deadline' => ['nullable', 'date'],
            'pic_user_id' => ['required', 'exists:users,id'],
            'follow_up' => ['nullable', 'string', 'max:1500'],
            'data_status' => ['required', Rule::in(['Disepakati', 'Usulan', 'Perlu Konfirmasi Manajemen'])],
        ]);

        $decision = $service->createDecision($data, $request->user());

        return back()->with('success', "Decision {$decision->code} logged.");
    }

    public function approveDecision(Request $request, Decision $decision, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('approveDecisions', Risk::class);

        $decision->update([
            'status' => 'Done',
            'data_status' => 'Disepakati',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        $audit->log('governance.decision_approved', "Confirmed and finalized decision {$decision->code}.", $decision);

        return back()->with('success', "Decision {$decision->code} confirmed & marked Done.");
    }
}

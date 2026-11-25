<?php

namespace App\Http\Controllers;

use App\Domain\Kpi\Models\KpiDefinition;
use App\Domain\Kpi\Models\KpiEvaluation;
use App\Domain\Kpi\Services\KpiService;
use App\Domain\Organization\Models\EmployeeProfile;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class KpiController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', KpiDefinition::class);

        $user = $request->user();
        $canViewAll = $user->hasPermissionTo('kpi.view_all');

        $profilesQuery = EmployeeProfile::query()
            ->with([
                'user:id,name,email',
                'position:id,title',
                'department:id,name',
            ])
            ->orderBy('employee_code');

        if (! $canViewAll) {
            $profilesQuery->where('user_id', $user->id);
        }

        $profiles = $profilesQuery->get();
        $userIds = $profiles->pluck('user_id')->all();

        $definitionsByUser = KpiDefinition::query()
            ->whereIn('user_id', $userIds)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->groupBy('user_id');

        $evaluations = KpiEvaluation::query()
            ->with(['user:id,name', 'evaluator:id,name', 'approver:id,name', 'items.definition:id,code,name,target_label,weight'])
            ->whereIn('user_id', $userIds)
            ->latest('period_label')
            ->get();

        $members = $profiles->map(function (EmployeeProfile $p) use ($definitionsByUser, $evaluations) {
            $defs = $definitionsByUser->get($p->user_id, collect());
            $memberEvals = $evaluations->where('user_id', $p->user_id)->values();
            $latest = $memberEvals->first();

            return [
                'user_id' => $p->user_id,
                'employee_code' => $p->employee_code,
                'name' => $p->user?->name,
                'position' => $p->position?->title,
                'department' => $p->department?->name,
                'avatar_color' => $p->avatar_color,
                'total_weight' => round((float) $defs->sum('weight'), 4),
                'definitions' => $defs->map(fn (KpiDefinition $d) => [
                    'id' => $d->id,
                    'code' => $d->code,
                    'sort_order' => $d->sort_order,
                    'name' => $d->name,
                    'definition' => $d->definition,
                    'target_label' => $d->target_label,
                    'evaluation_period' => $d->evaluation_period,
                    'weight' => (float) $d->weight,
                    'data_status' => $d->data_status,
                ])->values(),
                'latest_evaluation' => $latest ? [
                    'id' => $latest->id,
                    'period_label' => $latest->period_label,
                    'period_type' => $latest->period_type,
                    'total_score' => (float) $latest->total_score,
                    'rating_band' => $latest->rating_band,
                    'status' => $latest->status,
                    'approver' => $latest->approver?->name,
                ] : null,
                'evaluations' => $memberEvals->map(fn (KpiEvaluation $ev) => [
                    'id' => $ev->id,
                    'period_type' => $ev->period_type,
                    'period_label' => $ev->period_label,
                    'total_score' => (float) $ev->total_score,
                    'rating_band' => $ev->rating_band,
                    'status' => $ev->status,
                    'evaluator' => $ev->evaluator?->name,
                    'approver' => $ev->approver?->name,
                    'notes' => $ev->notes,
                    'items' => $ev->items->map(fn ($it) => [
                        'id' => $it->id,
                        'kpi_definition_id' => $it->kpi_definition_id,
                        'code' => $it->definition?->code,
                        'name' => $it->definition?->name,
                        'target_label' => $it->definition?->target_label,
                        'actual_value' => $it->actual_value,
                        'score' => (float) $it->score,
                        'weight' => (float) $it->weight_snapshot,
                        'weighted_score' => (float) $it->weighted_score,
                        'notes' => $it->notes,
                    ]),
                ]),
            ];
        });

        return Inertia::render('Kpi/Index', [
            'members' => $members,
            'ratingGuide' => [
                ['range' => '90–100', 'band' => 'Sangat baik', 'description' => 'Melebihi target dengan kualitas tinggi'],
                ['range' => '80–89', 'band' => 'Baik', 'description' => 'Target tercapai dengan kualitas sesuai standar'],
                ['range' => '70–79', 'band' => 'Cukup', 'description' => 'Target tercapai sebagian; perlu perbaikan terarah'],
                ['range' => '<70', 'band' => 'Perlu perbaikan', 'description' => 'Ada target tidak tercapai atau masalah kualitas'],
            ],
            'permissions' => [
                'canViewAll' => $canViewAll,
                'canEdit' => $user->can('edit', KpiDefinition::class),
                'canApprove' => $user->can('approve', KpiDefinition::class),
            ],
        ]);
    }

    public function updateWeights(Request $request, User $member, KpiService $service): RedirectResponse
    {
        $this->authorize('edit', KpiDefinition::class);

        $data = $request->validate([
            'weights' => ['required', 'array'],
            'weights.*' => ['required', 'numeric', 'min:0', 'max:1'],
        ]);

        $service->updateMemberWeights($member, $data['weights'], $request->user());

        return back()->with('success', "KPI weights updated for {$member->name}.");
    }

    public function storeEvaluation(Request $request, User $member, KpiService $service): RedirectResponse
    {
        $this->authorize('edit', KpiDefinition::class);

        $data = $request->validate([
            'period_type' => ['required', Rule::in(['Bulanan', 'Kuartalan'])],
            'period_label' => ['required', 'string', 'max:40'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array'],
            'items.*.actual_value' => ['nullable', 'string', 'max:255'],
            'items.*.score' => ['required', 'numeric', 'min:0', 'max:100'],
            'items.*.notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $service->recordEvaluation(
            $member,
            $data['period_type'],
            $data['period_label'],
            $data['items'],
            $request->user(),
            $data['notes'] ?? null
        );

        return back()->with('success', "KPI evaluation saved for {$member->name} ({$data['period_label']}).");
    }

    public function approveEvaluation(Request $request, KpiEvaluation $evaluation, KpiService $service): RedirectResponse
    {
        $this->authorize('approve', KpiDefinition::class);
        $service->approveEvaluation($evaluation, $request->user());

        return back()->with('success', "KPI evaluation {$evaluation->period_label} approved.");
    }
}

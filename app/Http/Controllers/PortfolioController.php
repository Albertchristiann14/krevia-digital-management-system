<?php

namespace App\Http\Controllers;

use App\Domain\Portfolio\Models\DemoAsset;
use App\Domain\Portfolio\Models\DemoCriteriaCheck;
use App\Domain\Portfolio\Models\DemoProduct;
use App\Domain\Portfolio\Services\DemoReadinessService;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PortfolioController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', DemoProduct::class);

        $demos = DemoProduct::query()
            ->with([
                'pic:id,name',
                'technicalApprover:id,name',
                'commercialApprover:id,name',
                'criteriaChecks',
                'assets:id,demo_product_id,asset_type,title',
            ])
            ->withCount('contentItems')
            ->orderBy('code')
            ->get();

        $users = User::query()->where('is_active', true)->orderBy('id')->get(['id', 'name']);

        return Inertia::render('Portfolio/Index', [
            'demos' => $demos->map(fn (DemoProduct $d) => [
                'id' => $d->id,
                'code' => $d->code,
                'name' => $d->name,
                'service_line' => $d->service_line,
                'purpose' => $d->purpose,
                'features_summary' => $d->features_summary,
                'pic_name' => $d->pic?->name,
                'supporting_team' => $d->supporting_team,
                'start_date' => $d->start_date?->format('Y-m-d'),
                'target_end_date' => $d->target_end_date?->format('Y-m-d'),
                'status' => $d->status,
                'label_type' => $d->label_type,
                'is_conditional' => $d->is_conditional,
                'data_status' => $d->data_status,
                'staging_url' => $d->staging_url,
                'is_ready_to_present' => $d->is_ready_to_present,
                'technical_approved' => $d->technical_approved_by !== null,
                'commercial_approved' => $d->commercial_approved_by !== null,
                'criteria_met_count' => $d->criteriaChecks->where('is_met', true)->count(),
                'assets_count' => $d->assets->count(),
                'content_items_count' => $d->content_items_count,
                'notes' => $d->notes,
            ]),
            'activeDemoCount' => $demos->where('status', 'In Progress')->count(),
            'maxActiveDemos' => DemoProduct::MAX_ACTIVE_DEMOS,
            'readyDemoCount' => $demos->where('is_ready_to_present', true)->count(),
            'serviceLines' => DemoProduct::SERVICE_LINES,
            'statuses' => DemoProduct::STATUSES,
            'users' => $users,
            'canCreate' => $request->user()?->can('create', DemoProduct::class) ?? false,
        ]);
    }

    public function store(Request $request, DemoReadinessService $service, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('create', DemoProduct::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'service_line' => ['required', Rule::in(DemoProduct::SERVICE_LINES)],
            'purpose' => ['nullable', 'string', 'max:1500'],
            'features_summary' => ['nullable', 'string', 'max:2000'],
            'pic_user_id' => ['required', 'exists:users,id'],
            'supporting_team' => ['nullable', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'target_end_date' => ['nullable', 'date'],
            'is_conditional' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $demo = DB::transaction(function () use ($data, $service, $audit, $request): DemoProduct {
            $maxNum = DemoProduct::withTrashed()
                ->where('code', 'like', 'PD-%')
                ->pluck('code')
                ->map(fn (string $c) => (int) str_replace('PD-', '', $c))
                ->max() ?? 0;

            $demo = DemoProduct::create([
                'code' => sprintf('PD-%02d', $maxNum + 1),
                ...$data,
                'status' => 'Not Started',
                'label_type' => 'contoh internal',
                'data_status' => ($data['is_conditional'] ?? false) ? 'Perlu Konfirmasi Manajemen' : 'Disepakati',
            ]);

            $service->seedCriteriaForDemo($demo);

            $audit->log('portfolio.demo_created', "Created demo {$demo->code}: {$demo->name}.", $demo, null, null, $request->user()->id);

            return $demo;
        });

        return redirect()->route('portfolio.show', $demo)->with('success', "Demo {$demo->code} created.");
    }

    public function show(Request $request, DemoProduct $demo): Response
    {
        $this->authorize('view', $demo);

        $demo->load([
            'pic:id,name',
            'technicalApprover:id,name',
            'commercialApprover:id,name',
            'criteriaChecks.checker:id,name',
            'assets.uploader:id,name',
            'contentItems:id,demo_product_id,code,platform,category,title_topic,publish_date,status',
        ]);

        $users = User::query()->where('is_active', true)->orderBy('id')->get(['id', 'name']);

        return Inertia::render('Portfolio/Show', [
            'demo' => [
                'id' => $demo->id,
                'code' => $demo->code,
                'name' => $demo->name,
                'service_line' => $demo->service_line,
                'purpose' => $demo->purpose,
                'features_summary' => $demo->features_summary,
                'feature_checklist' => $demo->feature_checklist ?? [],
                'qa_checklist' => $demo->qa_checklist ?? [],
                'pic_user_id' => $demo->pic_user_id,
                'pic_name' => $demo->pic?->name,
                'supporting_team' => $demo->supporting_team,
                'start_date' => $demo->start_date?->format('Y-m-d'),
                'target_end_date' => $demo->target_end_date?->format('Y-m-d'),
                'status' => $demo->status,
                'label_type' => $demo->label_type,
                'client_permission_granted' => $demo->client_permission_granted,
                'is_conditional' => $demo->is_conditional,
                'data_status' => $demo->data_status,
                'staging_url' => $demo->staging_url,
                'documentation_url' => $demo->documentation_url,
                'technical_approver' => $demo->technicalApprover?->name,
                'technical_approved_at' => $demo->technical_approved_at?->format('Y-m-d H:i'),
                'commercial_approver' => $demo->commercialApprover?->name,
                'commercial_approved_at' => $demo->commercial_approved_at?->format('Y-m-d H:i'),
                'is_ready_to_present' => $demo->is_ready_to_present,
                'notes' => $demo->notes,
                'criteria_checks' => $demo->criteriaChecks->map(fn (DemoCriteriaCheck $c) => [
                    'id' => $c->id,
                    'criterion_key' => $c->criterion_key,
                    'label' => $c->label,
                    'sort_order' => $c->sort_order,
                    'is_met' => $c->is_met,
                    'evidence_note' => $c->evidence_note,
                    'checker' => $c->checker?->name,
                    'checked_at' => $c->checked_at?->format('Y-m-d H:i'),
                ]),
                'assets' => $demo->assets->map(fn (DemoAsset $a) => [
                    'id' => $a->id,
                    'asset_type' => $a->asset_type,
                    'title' => $a->title,
                    'has_file' => $a->file_path !== null,
                    'external_url' => $a->external_url,
                    'uploader' => $a->uploader?->name,
                    'created_at' => $a->created_at?->format('Y-m-d'),
                ]),
                'content_items' => $demo->contentItems->map(fn ($ci) => [
                    'id' => $ci->id,
                    'code' => $ci->code,
                    'platform' => $ci->platform,
                    'category' => $ci->category,
                    'title_topic' => $ci->title_topic,
                    'publish_date' => $ci->publish_date?->format('Y-m-d'),
                    'status' => $ci->status,
                ]),
            ],
            'activeDemoCount' => DemoProduct::where('status', 'In Progress')->count(),
            'maxActiveDemos' => DemoProduct::MAX_ACTIVE_DEMOS,
            'statuses' => DemoProduct::STATUSES,
            'users' => $users,
            'permissions' => [
                'canUpdate' => $request->user()?->can('update', $demo) ?? false,
                'canApproveTechnical' => $request->user()?->can('approveTechnical', $demo) ?? false,
                'canApproveCommercial' => $request->user()?->can('approveCommercial', $demo) ?? false,
            ],
        ]);
    }

    public function update(Request $request, DemoProduct $demo, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('update', $demo);

        $data = $request->validate([
            'pic_user_id' => ['sometimes', 'exists:users,id'],
            'supporting_team' => ['nullable', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'target_end_date' => ['nullable', 'date'],
            'staging_url' => ['nullable', 'url', 'max:500'],
            'documentation_url' => ['nullable', 'url', 'max:500'],
            'client_permission_granted' => ['sometimes', 'boolean'],
            'label_type' => ['sometimes', Rule::in(['contoh internal', 'klien nyata'])],
            'data_status' => ['sometimes', Rule::in(['Disepakati', 'Usulan', 'Perlu Konfirmasi Manajemen'])],
            'feature_checklist' => ['nullable', 'array'],
            'qa_checklist' => ['nullable', 'array'],
            'notes' => ['nullable', 'string', 'max:2500'],
        ]);

        if (($data['label_type'] ?? $demo->label_type) === 'klien nyata' && ! ($data['client_permission_granted'] ?? $demo->client_permission_granted)) {
            return back()->withErrors(['label_type' => 'Client permission must be granted before removing the "contoh internal" label.']);
        }

        $demo->update($data);
        $audit->log('portfolio.demo_updated', "Updated details for {$demo->code}.", $demo);

        return back()->with('success', "Demo {$demo->code} updated.");
    }

    public function transitionStatus(Request $request, DemoProduct $demo, DemoReadinessService $service): RedirectResponse
    {
        $this->authorize('update', $demo);

        $data = $request->validate([
            'status' => ['required', Rule::in(DemoProduct::STATUSES)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $service->transitionStatus($demo, $data['status'], $request->user(), $data['notes'] ?? null);

        return back()->with('success', "Demo {$demo->code} status updated to {$data['status']}.");
    }

    public function toggleCriterion(
        Request $request,
        DemoProduct $demo,
        DemoCriteriaCheck $criterion,
        DemoReadinessService $service
    ): RedirectResponse {
        $this->authorize('update', $demo);
        abort_unless($criterion->demo_product_id === $demo->id, 404);

        $data = $request->validate([
            'is_met' => ['required', 'boolean'],
            'evidence_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $service->toggleCriterion($criterion, (bool) $data['is_met'], $request->user(), $data['evidence_note'] ?? null);

        return back()->with('success', 'Presentation criterion updated.');
    }

    public function approveTechnical(Request $request, DemoProduct $demo, DemoReadinessService $service): RedirectResponse
    {
        $this->authorize('approveTechnical', $demo);
        $service->approveTechnical($demo, $request->user());

        return back()->with('success', "Technical approval recorded for {$demo->code}.");
    }

    public function approveCommercial(Request $request, DemoProduct $demo, DemoReadinessService $service): RedirectResponse
    {
        $this->authorize('approveCommercial', $demo);
        $service->approveCommercial($demo, $request->user());

        return back()->with('success', "Commercial approval recorded for {$demo->code}.");
    }

    public function storeAsset(Request $request, DemoProduct $demo, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('update', $demo);

        $data = $request->validate([
            'asset_type' => ['required', Rule::in(DemoAsset::TYPES)],
            'title' => ['required', 'string', 'max:255'],
            'external_url' => ['nullable', 'url', 'max:500'],
            'file' => ['nullable', 'file', 'max:20480'],
        ]);

        if (empty($data['external_url']) && ! $request->hasFile('file')) {
            return back()->withErrors(['file' => 'Provide either an uploaded file or an external URL.']);
        }

        $filePath = null;
        $mime = null;
        $size = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $filePath = $file->store("demo-assets/{$demo->id}", 'local');
            $mime = $file->getMimeType();
            $size = $file->getSize();
        }

        DemoAsset::create([
            'demo_product_id' => $demo->id,
            'asset_type' => $data['asset_type'],
            'title' => $data['title'],
            'file_path' => $filePath,
            'external_url' => $data['external_url'] ?? null,
            'mime_type' => $mime,
            'file_size' => $size,
            'uploaded_by' => $request->user()->id,
        ]);

        $audit->log('portfolio.asset_added', "Added {$data['asset_type']} asset to {$demo->code}.", $demo);

        return back()->with('success', 'Demo asset added.');
    }

    public function downloadAsset(DemoProduct $demo, DemoAsset $asset): StreamedResponse
    {
        $this->authorize('view', $demo);
        abort_unless($asset->demo_product_id === $demo->id && $asset->file_path, 404);
        abort_unless(Storage::disk('local')->exists($asset->file_path), 404);

        return Storage::disk('local')->download($asset->file_path, $asset->title);
    }
}

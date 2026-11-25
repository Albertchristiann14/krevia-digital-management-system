<?php

namespace App\Http\Controllers;

use App\Domain\Marketing\Models\ContentAsset;
use App\Domain\Marketing\Models\ContentItem;
use App\Domain\Marketing\Models\ContentMetric;
use App\Domain\Marketing\Services\ContentWorkflowService;
use App\Domain\Portfolio\Models\DemoProduct;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MarketingController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', ContentItem::class);

        $query = ContentItem::query()
            ->with([
                'demoProduct:id,code,name,is_ready_to_present',
                'pic:id,name',
                'reviewer:id,name',
            ])
            ->withCount('assets');

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->whereLike('code', "%{$search}%", caseSensitive: false)
                    ->orWhereLike('title_topic', "%{$search}%", caseSensitive: false);
            });
        }

        if ($platform = $request->string('platform')->trim()->toString()) {
            $query->where('platform', $platform);
        }

        if ($category = $request->string('category')->trim()->toString()) {
            $query->where('category', $category);
        }

        if ($status = $request->string('status')->trim()->toString()) {
            $query->where('status', $status);
        }

        if ($month = $request->string('month')->trim()->toString()) {
            $query->where('publish_date', 'like', "{$month}%");
        }

        $items = $query->orderBy('publish_date')->orderBy('code')->get();

        // Monthly report & platform metrics aggregated from real database records
        $allItems = ContentItem::query()->with('metrics')->get();
        $monthlySummary = $allItems
            ->filter(fn (ContentItem $c) => $c->publish_date !== null)
            ->groupBy(fn (ContentItem $c) => $c->publish_date->format('Y-m'))
            ->map(function ($group, string $ym) {
                $metrics = $group->flatMap->metrics;

                return [
                    'month' => $ym,
                    'total' => $group->count(),
                    'published' => $group->where('status', 'Published')->count(),
                    'scheduled' => $group->where('status', 'Scheduled')->count(),
                    'approved' => $group->where('is_approved', true)->count(),
                    'reach' => $metrics->sum('reach'),
                    'impressions' => $metrics->sum('impressions'),
                    'inquiries' => $metrics->sum('inquiries_generated'),
                ];
            })
            ->sortKeys()
            ->values();

        $demos = DemoProduct::query()->orderBy('code')->get(['id', 'code', 'name', 'service_line', 'is_ready_to_present']);
        $users = User::query()->where('is_active', true)->orderBy('id')->get(['id', 'name']);

        return Inertia::render('Marketing/Index', [
            'viewMode' => $request->string('view', 'calendar')->toString(),
            'items' => $items->map(fn (ContentItem $c) => [
                'id' => $c->id,
                'code' => $c->code,
                'platform' => $c->platform,
                'category' => $c->category,
                'title_topic' => $c->title_topic,
                'production_date' => $c->production_date?->format('Y-m-d'),
                'review_date' => $c->review_date?->format('Y-m-d'),
                'publish_date' => $c->publish_date?->format('Y-m-d'),
                'status' => $c->status,
                'is_approved' => $c->is_approved,
                'is_reused_reel' => $c->is_reused_reel,
                'published_url' => $c->published_url,
                'pic_name' => $c->pic?->name,
                'reviewer_name' => $c->reviewer?->name,
                'assets_count' => $c->assets_count,
                'demo' => $c->demoProduct ? [
                    'id' => $c->demoProduct->id,
                    'code' => $c->demoProduct->code,
                    'is_ready_to_present' => $c->demoProduct->is_ready_to_present,
                ] : null,
                'requires_ready_demo' => in_array($c->category, ContentItem::DEMO_GATED_CATEGORIES, true),
            ]),
            'stats' => [
                'total' => $allItems->count(),
                'planned' => $allItems->where('status', 'Planned')->count(),
                'in_review' => $allItems->where('status', 'In Review')->count(),
                'approved' => $allItems->where('is_approved', true)->count(),
                'scheduled' => $allItems->where('status', 'Scheduled')->count(),
                'published' => $allItems->where('status', 'Published')->count(),
            ],
            'monthlySummary' => $monthlySummary,
            'frequencyGuidelines' => ContentItem::FREQUENCY_GUIDELINES,
            'platforms' => ContentItem::PLATFORMS,
            'categories' => ContentItem::CATEGORIES,
            'statuses' => ContentItem::STATUSES,
            'demos' => $demos,
            'users' => $users,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'platform' => $request->string('platform')->toString(),
                'category' => $request->string('category')->toString(),
                'status' => $request->string('status')->toString(),
                'month' => $request->string('month')->toString(),
            ],
            'permissions' => [
                'canCreate' => $request->user()?->can('create', ContentItem::class) ?? false,
            ],
        ]);
    }

    public function store(Request $request, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('create', ContentItem::class);

        $data = $request->validate([
            'platform' => ['required', Rule::in(ContentItem::PLATFORMS)],
            'category' => ['required', Rule::in(ContentItem::CATEGORIES)],
            'title_topic' => ['required', 'string', 'max:1000'],
            'brief' => ['nullable', 'string', 'max:3000'],
            'demo_product_id' => ['nullable', 'exists:demo_products,id'],
            'pic_user_id' => ['required', 'exists:users,id'],
            'reviewer_user_id' => ['nullable', 'exists:users,id'],
            'production_date' => ['nullable', 'date'],
            'review_date' => ['nullable', 'date'],
            'publish_date' => ['required', 'date'],
            'is_reused_reel' => ['sometimes', 'boolean'],
        ]);

        $maxNum = ContentItem::withTrashed()
            ->where('code', 'like', 'C-%')
            ->pluck('code')
            ->map(fn (string $c) => (int) str_replace('C-', '', $c))
            ->max() ?? 0;

        $reviewerId = $data['reviewer_user_id'] ?? null;
        if (! $reviewerId && isset(ContentItem::CATEGORY_REVIEWER_EMAILS[$data['category']])) {
            $reviewerId = User::where('email', ContentItem::CATEGORY_REVIEWER_EMAILS[$data['category']])->value('id');
        }

        $item = ContentItem::create([
            'code' => sprintf('C-%03d', $maxNum + 1),
            'demo_product_id' => $data['demo_product_id'] ?? null,
            'platform' => $data['platform'],
            'category' => $data['category'],
            'title_topic' => $data['title_topic'],
            'brief' => $data['brief'] ?? null,
            'pic_user_id' => $data['pic_user_id'],
            'reviewer_user_id' => $reviewerId,
            'production_date' => $data['production_date'] ?? now()->parse($data['publish_date'])->subDays(5)->toDateString(),
            'review_date' => $data['review_date'] ?? now()->parse($data['publish_date'])->subDays(2)->toDateString(),
            'publish_date' => $data['publish_date'],
            'status' => 'Planned',
            'is_reused_reel' => (bool) ($data['is_reused_reel'] ?? ($data['platform'] === 'TikTok')),
            'data_status' => 'Disepakati',
        ]);

        $audit->log('marketing.content_created', "Created content item {$item->code} ({$item->platform}).", $item);

        return redirect()->route('marketing.show', $item)->with('success', "Content item {$item->code} created.");
    }

    public function show(Request $request, ContentItem $contentItem): Response
    {
        $this->authorize('view', $contentItem);

        $contentItem->load([
            'demoProduct:id,code,name,service_line,is_ready_to_present',
            'pic:id,name',
            'reviewer:id,name',
            'approver:id,name',
            'assets.uploader:id,name',
            'approvals.reviewer:id,name',
            'metrics.recorder:id,name',
        ]);

        $demos = DemoProduct::query()->orderBy('code')->get(['id', 'code', 'name', 'service_line', 'is_ready_to_present']);
        $users = User::query()->where('is_active', true)->orderBy('id')->get(['id', 'name']);

        return Inertia::render('Marketing/Show', [
            'item' => [
                'id' => $contentItem->id,
                'code' => $contentItem->code,
                'platform' => $contentItem->platform,
                'category' => $contentItem->category,
                'title_topic' => $contentItem->title_topic,
                'brief' => $contentItem->brief,
                'caption' => $contentItem->caption,
                'hashtags' => $contentItem->hashtags,
                'pic_user_id' => $contentItem->pic_user_id,
                'pic_name' => $contentItem->pic?->name,
                'reviewer_user_id' => $contentItem->reviewer_user_id,
                'reviewer_name' => $contentItem->reviewer?->name,
                'demo_product_id' => $contentItem->demo_product_id,
                'demo' => $contentItem->demoProduct,
                'requires_ready_demo' => in_array($contentItem->category, ContentItem::DEMO_GATED_CATEGORIES, true),
                'production_date' => $contentItem->production_date?->format('Y-m-d'),
                'review_date' => $contentItem->review_date?->format('Y-m-d'),
                'publish_date' => $contentItem->publish_date?->format('Y-m-d'),
                'published_at' => $contentItem->published_at?->format('Y-m-d H:i'),
                'published_url' => $contentItem->published_url,
                'status' => $contentItem->status,
                'is_reused_reel' => $contentItem->is_reused_reel,
                'is_approved' => $contentItem->is_approved,
                'approver_name' => $contentItem->approver?->name,
                'approved_at' => $contentItem->approved_at?->format('Y-m-d H:i'),
                'notes' => $contentItem->notes,
                'assets' => $contentItem->assets->map(fn (ContentAsset $a) => [
                    'id' => $a->id,
                    'asset_type' => $a->asset_type,
                    'title' => $a->title,
                    'has_file' => $a->file_path !== null,
                    'external_url' => $a->external_url,
                    'uploader' => $a->uploader?->name,
                    'created_at' => $a->created_at?->format('Y-m-d'),
                ]),
                'approvals' => $contentItem->approvals->map(fn ($ap) => [
                    'id' => $ap->id,
                    'decision' => $ap->decision,
                    'feedback' => $ap->feedback,
                    'reviewer' => $ap->reviewer?->name,
                    'reviewed_at' => $ap->reviewed_at?->format('Y-m-d H:i'),
                ]),
                'metrics' => $contentItem->metrics->map(fn (ContentMetric $m) => [
                    'id' => $m->id,
                    'recorded_date' => $m->recorded_date?->format('Y-m-d'),
                    'reach' => $m->reach,
                    'impressions' => $m->impressions,
                    'likes' => $m->likes,
                    'comments' => $m->comments,
                    'shares' => $m->shares,
                    'saves' => $m->saves,
                    'clicks' => $m->clicks,
                    'inquiries_generated' => $m->inquiries_generated,
                    'recorder' => $m->recorder?->name,
                ]),
            ],
            'statuses' => ContentItem::STATUSES,
            'platforms' => ContentItem::PLATFORMS,
            'categories' => ContentItem::CATEGORIES,
            'demos' => $demos,
            'users' => $users,
            'permissions' => [
                'canUpdate' => $request->user()?->can('update', $contentItem) ?? false,
                'canApprove' => $request->user()?->can('approve', $contentItem) ?? false,
                'canPublish' => $request->user()?->can('publish', $contentItem) ?? false,
            ],
        ]);
    }

    public function update(Request $request, ContentItem $contentItem, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('update', $contentItem);

        $data = $request->validate([
            'title_topic' => ['sometimes', 'string', 'max:1000'],
            'brief' => ['nullable', 'string', 'max:3000'],
            'caption' => ['nullable', 'string', 'max:4000'],
            'hashtags' => ['nullable', 'string', 'max:1000'],
            'demo_product_id' => ['nullable', 'exists:demo_products,id'],
            'reviewer_user_id' => ['nullable', 'exists:users,id'],
            'production_date' => ['nullable', 'date'],
            'review_date' => ['nullable', 'date'],
            'publish_date' => ['nullable', 'date'],
            'published_url' => ['nullable', 'url', 'max:500'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $contentItem->update($data);
        $audit->log('marketing.content_updated', "Updated content item {$contentItem->code}.", $contentItem);

        return back()->with('success', "Content {$contentItem->code} updated.");
    }

    public function transitionStatus(
        Request $request,
        ContentItem $contentItem,
        ContentWorkflowService $service
    ): RedirectResponse {
        $data = $request->validate([
            'status' => ['required', Rule::in(ContentItem::STATUSES)],
            'published_url' => ['nullable', 'url', 'max:500'],
        ]);

        if (in_array($data['status'], ['Scheduled', 'Published'], true)) {
            $this->authorize('publish', $contentItem);
        } else {
            $this->authorize('update', $contentItem);
        }

        $service->transitionStatus($contentItem, $data['status'], $request->user(), $data);

        return back()->with('success', "Content {$contentItem->code} moved to {$data['status']}.");
    }

    public function review(
        Request $request,
        ContentItem $contentItem,
        ContentWorkflowService $service
    ): RedirectResponse {
        $this->authorize('approve', $contentItem);

        $data = $request->validate([
            'decision' => ['required', Rule::in(['Approved', 'Revision Needed'])],
            'feedback' => ['nullable', 'string', 'max:2000'],
        ]);

        $service->reviewContent($contentItem, $request->user(), $data['decision'], $data['feedback'] ?? null);

        return back()->with('success', "Content {$contentItem->code} marked {$data['decision']}.");
    }

    public function storeAsset(Request $request, ContentItem $contentItem, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('update', $contentItem);

        $data = $request->validate([
            'asset_type' => ['required', Rule::in(ContentAsset::TYPES)],
            'title' => ['required', 'string', 'max:255'],
            'external_url' => ['nullable', 'url', 'max:500'],
            'file' => ['nullable', 'file', 'max:51200'],
        ]);

        if (empty($data['external_url']) && ! $request->hasFile('file')) {
            return back()->withErrors(['file' => 'Provide an asset file or external URL.']);
        }

        $filePath = null;
        $mime = null;
        $size = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $filePath = $file->store("content-assets/{$contentItem->id}", 'local');
            $mime = $file->getMimeType();
            $size = $file->getSize();
        }

        ContentAsset::create([
            'content_item_id' => $contentItem->id,
            'asset_type' => $data['asset_type'],
            'title' => $data['title'],
            'file_path' => $filePath,
            'external_url' => $data['external_url'] ?? null,
            'mime_type' => $mime,
            'file_size' => $size,
            'uploaded_by' => $request->user()->id,
        ]);

        $audit->log('marketing.asset_uploaded', "Uploaded asset for {$contentItem->code}.", $contentItem);

        return back()->with('success', 'Asset attached.');
    }

    public function downloadAsset(ContentItem $contentItem, ContentAsset $asset): StreamedResponse
    {
        $this->authorize('view', $contentItem);
        abort_unless($asset->content_item_id === $contentItem->id && $asset->file_path, 404);
        abort_unless(Storage::disk('local')->exists($asset->file_path), 404);

        return Storage::disk('local')->download($asset->file_path, $asset->title);
    }

    public function storeMetric(Request $request, ContentItem $contentItem): RedirectResponse
    {
        $this->authorize('update', $contentItem);

        $data = $request->validate([
            'recorded_date' => ['required', 'date'],
            'reach' => ['required', 'integer', 'min:0'],
            'impressions' => ['required', 'integer', 'min:0'],
            'likes' => ['required', 'integer', 'min:0'],
            'comments' => ['required', 'integer', 'min:0'],
            'shares' => ['required', 'integer', 'min:0'],
            'saves' => ['required', 'integer', 'min:0'],
            'clicks' => ['required', 'integer', 'min:0'],
            'inquiries_generated' => ['required', 'integer', 'min:0'],
        ]);

        ContentMetric::create([
            'content_item_id' => $contentItem->id,
            ...$data,
            'recorded_by' => $request->user()->id,
        ]);

        return back()->with('success', 'Content performance metrics recorded.');
    }
}

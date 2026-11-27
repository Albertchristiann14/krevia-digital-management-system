<?php

namespace App\Http\Controllers;

use App\Domain\Marketing\Models\ContentAsset;
use App\Domain\Marketing\Models\ContentItem;
use App\Domain\Marketing\Models\ContentMetric;
use App\Domain\Marketing\Services\ContentWorkflowService;
use App\Domain\Portfolio\Models\DemoProduct;
use App\Domain\Shared\Services\ReferenceCacheService;
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
    public function index(Request $request, ReferenceCacheService $refs): Response
    {
        $this->authorize('viewAny', ContentItem::class);

        $query = ContentItem::query()
            ->with([
                'demoProduct:id,code,name,is_ready_to_present',
                'pic:id,name,email,avatar_path,updated_at',
                'pic.employeeProfile:id,user_id,avatar_color',
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

        // Monthly report & platform metrics aggregated efficiently without loading full content bodies
        $allItems = ContentItem::query()
            ->whereNotNull('publish_date')
            ->withSum('metrics as reach_sum', 'reach')
            ->withSum('metrics as impressions_sum', 'impressions')
            ->withSum('metrics as inquiries_sum', 'inquiries_generated')
            ->get(['id', 'publish_date', 'status', 'is_approved']);

        $monthlySummary = $allItems
            ->groupBy(fn (ContentItem $c) => $c->publish_date->format('Y-m'))
            ->map(function ($group, string $ym) {
                return [
                    'month' => $ym,
                    'total' => $group->count(),
                    'published' => $group->where('status', 'Published')->count(),
                    'scheduled' => $group->where('status', 'Scheduled')->count(),
                    'approved' => $group->where('is_approved', true)->count(),
                    'reach' => (int) $group->sum('reach_sum'),
                    'impressions' => (int) $group->sum('impressions_sum'),
                    'inquiries' => (int) $group->sum('inquiries_sum'),
                ];
            })
            ->sortKeys()
            ->values();

        $demos = DemoProduct::query()->orderBy('code')->get(['id', 'code', 'name', 'service_line', 'is_ready_to_present']);
        $users = User::query()
            ->with('employeeProfile:id,user_id,avatar_color')
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'avatar_path', 'updated_at'])
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'avatar_url' => $u->avatarUrl(),
                'avatar_color' => $u->employeeProfile?->avatar_color ?? '#101D35',
            ]);

        return Inertia::render('Marketing/Index', [
            'viewMode' => $request->string('view', 'calendar')->toString(),
            'items' => $items->map(fn (ContentItem $c) => [
                'id' => $c->id,
                'code' => $c->code,
                'platform' => $c->platform,
                'category' => $c->category,
                'content_format' => $c->content_format,
                'title_topic' => $c->title_topic,
                'production_date' => $c->production_date?->format('Y-m-d'),
                'review_date' => $c->review_date?->format('Y-m-d'),
                'publish_date' => $c->publish_date?->format('Y-m-d'),
                'status' => $c->status,
                'is_approved' => $c->is_approved,
                'is_reused_reel' => $c->is_reused_reel,
                'published_url' => $c->published_url,
                'pic_user_id' => $c->pic_user_id,
                'pic_name' => $c->pic?->name,
                'pic_email' => $c->pic?->email,
                'pic_avatar_url' => $c->pic?->avatarUrl(),
                'pic_avatar_color' => $c->pic?->employeeProfile?->avatar_color ?? '#101D35',
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
            'formats' => ContentItem::FORMATS,
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
            'content_format' => ['nullable', Rule::in(ContentItem::FORMATS)],
            'title_topic' => ['required', 'string', 'max:1000'],
            'brief' => ['nullable', 'string', 'max:3000'],
            'structured_brief' => ['nullable', 'array'],
            'demo_product_id' => ['nullable', 'exists:demo_products,id'],
            'pic_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('is_active', true)],
            'reviewer_user_id' => ['nullable', 'exists:users,id'],
            'production_date' => ['nullable', 'date'],
            'review_date' => ['nullable', 'date'],
            'publish_date' => ['required', 'date'],
            'is_reused_reel' => ['sometimes', 'boolean'],
        ]);

        $structuredBrief = $this->validateAndNormalizeStructuredBrief(
            $request,
            $data['content_format'] ?? null
        );

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
            'content_format' => $data['content_format'] ?? null,
            'title_topic' => $data['title_topic'],
            'brief' => $data['brief'] ?? null,
            'structured_brief' => $structuredBrief,
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
            'pic:id,name,email,avatar_path,updated_at',
            'pic.employeeProfile:id,user_id,avatar_color',
            'reviewer:id,name',
            'approver:id,name',
            'assets.uploader:id,name',
            'approvals.reviewer:id,name',
            'metrics.recorder:id,name',
        ]);

        $demos = DemoProduct::query()->orderBy('code')->get(['id', 'code', 'name', 'service_line', 'is_ready_to_present']);
        $users = User::query()
            ->with('employeeProfile:id,user_id,avatar_color')
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'avatar_path', 'updated_at'])
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'avatar_url' => $u->avatarUrl(),
                'avatar_color' => $u->employeeProfile?->avatar_color ?? '#101D35',
            ]);

        return Inertia::render('Marketing/Show', [
            'item' => [
                'id' => $contentItem->id,
                'code' => $contentItem->code,
                'platform' => $contentItem->platform,
                'category' => $contentItem->category,
                'content_format' => $contentItem->content_format,
                'title_topic' => $contentItem->title_topic,
                'brief' => $contentItem->brief,
                'structured_brief' => $contentItem->structured_brief,
                'caption' => $contentItem->caption,
                'hashtags' => $contentItem->hashtags,
                'pic_user_id' => $contentItem->pic_user_id,
                'pic_name' => $contentItem->pic?->name,
                'pic_email' => $contentItem->pic?->email,
                'pic_avatar_url' => $contentItem->pic?->avatarUrl(),
                'pic_avatar_color' => $contentItem->pic?->employeeProfile?->avatar_color ?? '#101D35',
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
            'formats' => ContentItem::FORMATS,
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
            'content_format' => ['sometimes', 'nullable', Rule::in(ContentItem::FORMATS)],
            'brief' => ['nullable', 'string', 'max:3000'],
            'structured_brief' => ['sometimes', 'nullable', 'array'],
            'caption' => ['nullable', 'string', 'max:4000'],
            'hashtags' => ['nullable', 'string', 'max:1000'],
            'demo_product_id' => ['nullable', 'exists:demo_products,id'],
            'pic_user_id' => ['sometimes', 'nullable', 'integer', Rule::exists('users', 'id')->where('is_active', true)],
            'reviewer_user_id' => ['nullable', 'exists:users,id'],
            'production_date' => ['nullable', 'date'],
            'review_date' => ['nullable', 'date'],
            'publish_date' => ['nullable', 'date'],
            'published_url' => ['nullable', 'url', 'max:500'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($request->has('structured_brief') || $request->has('content_format')) {
            $effectiveFormat = $request->has('content_format')
                ? ($data['content_format'] ?? null)
                : $contentItem->content_format;
            if ($request->has('structured_brief') && $request->input('structured_brief') !== null) {
                $data['structured_brief'] = $this->validateAndNormalizeStructuredBrief(
                    $request,
                    $effectiveFormat
                );
            }
        }

        $oldPicId = $contentItem->pic_user_id;
        $contentItem->update($data);

        if (
            array_key_exists('pic_user_id', $data)
            && (int) ($data['pic_user_id'] ?? 0) !== (int) ($oldPicId ?? 0)
        ) {
            $newPicName = $contentItem->fresh()->pic?->name ?? 'Unassigned';
            $audit->log(
                'marketing.pic_updated',
                "Changed PIC for {$contentItem->code} to {$newPicName}.",
                $contentItem,
                ['pic_user_id' => $oldPicId],
                ['pic_user_id' => $contentItem->pic_user_id]
            );
        } else {
            $audit->log('marketing.content_updated', "Updated content item {$contentItem->code}.", $contentItem);
        }

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

    /**
     * Validate and normalize structured brief payload according to content_format.
     */
    private function validateAndNormalizeStructuredBrief(Request $request, ?string $format): ?array
    {
        $raw = $request->input('structured_brief');
        if (! $format || ! is_array($raw)) {
            return null;
        }

        if ($format === 'Carousel') {
            $validated = $request->validate([
                'structured_brief.canvas_size' => ['nullable', 'string', 'max:100'],
                'structured_brief.visual_direction' => ['nullable', 'string', 'max:2000'],
                'structured_brief.slides' => ['required', 'array', 'min:1'],
                'structured_brief.slides.*.role' => ['required', 'string', 'max:120'],
                'structured_brief.slides.*.headline' => ['required', 'string', 'max:500'],
                'structured_brief.slides.*.supporting_content' => ['nullable', 'string', 'max:2000'],
                'structured_brief.slides.*.visual_direction' => ['required', 'string', 'max:1500'],
                'structured_brief.slides.*.reference_image' => ['nullable', 'string', 'max:500'],
                'structured_brief.slides.*.notes' => ['nullable', 'string', 'max:1000'],
            ], [
                'structured_brief.slides.required' => 'Carousel brief requires at least one slide.',
                'structured_brief.slides.min' => 'Carousel brief requires at least one slide.',
            ])['structured_brief'];

            $slides = collect($validated['slides'] ?? [])->values()->map(fn (array $s, int $i) => [
                'slide_number' => $i + 1,
                'role' => $s['role'],
                'headline' => $s['headline'],
                'supporting_content' => $s['supporting_content'] ?? '',
                'visual_direction' => $s['visual_direction'],
                'reference_image' => $s['reference_image'] ?? '',
                'notes' => $s['notes'] ?? '',
            ])->all();

            return [
                'format' => 'Carousel',
                'canvas_size' => $validated['canvas_size'] ?? '1080 × 1350 px',
                'visual_direction' => $validated['visual_direction'] ?? '',
                'slides' => $slides,
            ];
        }

        if ($format === 'Single Image') {
            $validated = $request->validate([
                'structured_brief.headline' => ['required', 'string', 'max:500'],
                'structured_brief.main_message' => ['required', 'string', 'max:2000'],
                'structured_brief.supporting_info' => ['nullable', 'string', 'max:2000'],
                'structured_brief.cta' => ['nullable', 'string', 'max:500'],
                'structured_brief.visual_direction' => ['required', 'string', 'max:2000'],
                'structured_brief.canvas_size' => ['nullable', 'string', 'max:100'],
                'structured_brief.notes' => ['nullable', 'string', 'max:1500'],
            ])['structured_brief'];

            return [
                'format' => 'Single Image',
                'headline' => $validated['headline'],
                'main_message' => $validated['main_message'],
                'supporting_info' => $validated['supporting_info'] ?? '',
                'cta' => $validated['cta'] ?? '',
                'visual_direction' => $validated['visual_direction'],
                'canvas_size' => $validated['canvas_size'] ?? '1080 × 1350 px',
                'notes' => $validated['notes'] ?? '',
            ];
        }

        if ($format === 'Reels') {
            $validated = $request->validate([
                'structured_brief.aspect_ratio' => ['nullable', 'string', 'max:50'],
                'structured_brief.target_duration' => ['nullable', 'string', 'max:80'],
                'structured_brief.music_reference' => ['nullable', 'string', 'max:500'],
                'structured_brief.visual_style' => ['nullable', 'string', 'max:1500'],
                'structured_brief.scenes' => ['required', 'array', 'min:1'],
                'structured_brief.scenes.*.title' => ['required', 'string', 'max:300'],
                'structured_brief.scenes.*.duration' => ['nullable', 'string', 'max:50'],
                'structured_brief.scenes.*.visual_direction' => ['required', 'string', 'max:1500'],
                'structured_brief.scenes.*.on_screen_text' => ['nullable', 'string', 'max:500'],
                'structured_brief.scenes.*.voice_over' => ['nullable', 'string', 'max:1500'],
                'structured_brief.scenes.*.transition' => ['nullable', 'string', 'max:200'],
                'structured_brief.scenes.*.notes' => ['nullable', 'string', 'max:1000'],
            ], [
                'structured_brief.scenes.required' => 'Reels brief requires at least one scene.',
                'structured_brief.scenes.min' => 'Reels brief requires at least one scene.',
            ])['structured_brief'];

            $scenes = collect($validated['scenes'] ?? [])->values()->map(fn (array $s, int $i) => [
                'scene_number' => $i + 1,
                'title' => $s['title'],
                'duration' => $s['duration'] ?? '',
                'visual_direction' => $s['visual_direction'],
                'on_screen_text' => $s['on_screen_text'] ?? '',
                'voice_over' => $s['voice_over'] ?? '',
                'transition' => $s['transition'] ?? '',
                'notes' => $s['notes'] ?? '',
            ])->all();

            return [
                'format' => 'Reels',
                'aspect_ratio' => $validated['aspect_ratio'] ?? '9:16',
                'target_duration' => $validated['target_duration'] ?? '30–45s',
                'music_reference' => $validated['music_reference'] ?? '',
                'visual_style' => $validated['visual_style'] ?? '',
                'scenes' => $scenes,
            ];
        }

        if ($format === 'Video') {
            $validated = $request->validate([
                'structured_brief.hook' => ['required', 'string', 'max:1000'],
                'structured_brief.narration' => ['nullable', 'string', 'max:3000'],
                'structured_brief.visual_direction' => ['required', 'string', 'max:2000'],
                'structured_brief.closing_cta' => ['nullable', 'string', 'max:500'],
                'structured_brief.duration' => ['nullable', 'string', 'max:80'],
                'structured_brief.aspect_ratio' => ['nullable', 'string', 'max:50'],
                'structured_brief.notes' => ['nullable', 'string', 'max:1500'],
                'structured_brief.scenes' => ['required', 'array', 'min:1'],
                'structured_brief.scenes.*.title' => ['required', 'string', 'max:300'],
                'structured_brief.scenes.*.duration' => ['nullable', 'string', 'max:50'],
                'structured_brief.scenes.*.visual_direction' => ['required', 'string', 'max:1500'],
                'structured_brief.scenes.*.on_screen_text' => ['nullable', 'string', 'max:500'],
                'structured_brief.scenes.*.voice_over' => ['nullable', 'string', 'max:1500'],
                'structured_brief.scenes.*.transition' => ['nullable', 'string', 'max:200'],
                'structured_brief.scenes.*.notes' => ['nullable', 'string', 'max:1000'],
            ], [
                'structured_brief.scenes.required' => 'Video brief requires at least one scene.',
                'structured_brief.scenes.min' => 'Video brief requires at least one scene.',
            ])['structured_brief'];

            $scenes = collect($validated['scenes'] ?? [])->values()->map(fn (array $s, int $i) => [
                'scene_number' => $i + 1,
                'title' => $s['title'],
                'duration' => $s['duration'] ?? '',
                'visual_direction' => $s['visual_direction'],
                'on_screen_text' => $s['on_screen_text'] ?? '',
                'voice_over' => $s['voice_over'] ?? '',
                'transition' => $s['transition'] ?? '',
                'notes' => $s['notes'] ?? '',
            ])->all();

            return [
                'format' => 'Video',
                'hook' => $validated['hook'],
                'narration' => $validated['narration'] ?? '',
                'visual_direction' => $validated['visual_direction'],
                'closing_cta' => $validated['closing_cta'] ?? '',
                'duration' => $validated['duration'] ?? '',
                'aspect_ratio' => $validated['aspect_ratio'] ?? '16:9',
                'notes' => $validated['notes'] ?? '',
                'scenes' => $scenes,
            ];
        }

        if ($format === 'Story') {
            $validated = $request->validate([
                'structured_brief.frames' => ['required', 'array', 'min:1'],
                'structured_brief.frames.*.headline' => ['required', 'string', 'max:500'],
                'structured_brief.frames.*.main_text' => ['nullable', 'string', 'max:1500'],
                'structured_brief.frames.*.visual_direction' => ['required', 'string', 'max:1500'],
                'structured_brief.frames.*.interactive_element' => ['nullable', 'string', 'max:120'],
                'structured_brief.frames.*.cta' => ['nullable', 'string', 'max:300'],
                'structured_brief.frames.*.notes' => ['nullable', 'string', 'max:1000'],
            ], [
                'structured_brief.frames.required' => 'Story brief requires at least one frame.',
                'structured_brief.frames.min' => 'Story brief requires at least one frame.',
            ])['structured_brief'];

            $frames = collect($validated['frames'] ?? [])->values()->map(fn (array $f, int $i) => [
                'frame_number' => $i + 1,
                'headline' => $f['headline'],
                'main_text' => $f['main_text'] ?? '',
                'visual_direction' => $f['visual_direction'],
                'interactive_element' => $f['interactive_element'] ?? 'None',
                'cta' => $f['cta'] ?? '',
                'notes' => $f['notes'] ?? '',
            ])->all();

            return [
                'format' => 'Story',
                'frames' => $frames,
            ];
        }

        return null;
    }
}

<?php

namespace App\Domain\Marketing\Services;

use App\Domain\Marketing\Models\ContentApproval;
use App\Domain\Marketing\Models\ContentItem;
use App\Domain\Portfolio\Models\DemoProduct;
use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ContentWorkflowService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array<string, mixed>  $context
     */
    public function transitionStatus(ContentItem $item, string $newStatus, User $actor, array $context = []): ContentItem
    {
        if (! in_array($newStatus, ContentItem::STATUSES, true)) {
            throw ValidationException::withMessages([
                'status' => "Invalid content status '{$newStatus}'.",
            ]);
        }

        if (in_array($newStatus, ['Scheduled', 'Published'], true)) {
            if (! $item->is_approved) {
                throw ValidationException::withMessages([
                    'status' => "Content {$item->code} must pass Reviewer Approval before moving to {$newStatus}.",
                ]);
            }

            $this->assertDemoReadyIfRequired($item);
        }

        $publishedUrl = $context['published_url'] ?? $item->published_url;
        if ($newStatus === 'Published' && empty(trim((string) $publishedUrl))) {
            throw ValidationException::withMessages([
                'published_url' => 'Published URL is required when marking content as Published.',
            ]);
        }

        return DB::transaction(function () use ($item, $newStatus, $actor, $publishedUrl): ContentItem {
            $oldStatus = $item->status;
            $updates = ['status' => $newStatus];

            if ($newStatus === 'Published') {
                $updates['published_url'] = trim((string) $publishedUrl);
                $updates['published_at'] = $item->published_at ?? now();
            }

            $item->update($updates);

            $this->audit->log(
                'marketing.content_status_changed',
                "Content {$item->code} ({$item->platform}) moved from {$oldStatus} to {$newStatus}.",
                $item,
                ['status' => $oldStatus],
                ['status' => $newStatus],
                $actor->id
            );

            return $item->fresh();
        });
    }

    public function reviewContent(ContentItem $item, User $reviewer, string $decision, ?string $feedback = null): ContentItem
    {
        if (! in_array($decision, ['Approved', 'Revision Needed'], true)) {
            throw ValidationException::withMessages([
                'decision' => 'Review decision must be Approved or Revision Needed.',
            ]);
        }

        if ($decision === 'Revision Needed' && empty(trim((string) $feedback))) {
            throw ValidationException::withMessages([
                'feedback' => 'Revision feedback is required when requesting revisions.',
            ]);
        }

        return DB::transaction(function () use ($item, $reviewer, $decision, $feedback): ContentItem {
            ContentApproval::create([
                'content_item_id' => $item->id,
                'reviewer_user_id' => $reviewer->id,
                'decision' => $decision,
                'feedback' => $feedback,
                'reviewed_at' => now(),
            ]);

            if ($decision === 'Approved') {
                $item->update([
                    'is_approved' => true,
                    'approved_by' => $reviewer->id,
                    'approved_at' => now(),
                    'status' => 'Approved',
                ]);
            } else {
                $item->update([
                    'is_approved' => false,
                    'approved_by' => null,
                    'approved_at' => null,
                    'status' => 'Revision Needed',
                ]);
            }

            $this->audit->log(
                'marketing.content_reviewed',
                "Content {$item->code} reviewed by {$reviewer->name}: {$decision}.",
                $item,
                null,
                ['decision' => $decision, 'feedback' => $feedback],
                $reviewer->id
            );

            return $item->fresh();
        });
    }

    public function assertDemoReadyIfRequired(ContentItem $item): void
    {
        if (! in_array($item->category, ContentItem::DEMO_GATED_CATEGORIES, true)) {
            return;
        }

        if ($item->demo_product_id !== null) {
            $demo = $item->demoProduct;
            if (! $demo || ! $demo->is_ready_to_present) {
                $demoCode = $demo?->code ?? 'Linked Demo';
                throw ValidationException::withMessages([
                    'status' => "Publication blocked (Sheet 10/11 Rule): {$item->category} content cannot be scheduled or published before {$demoCode} passes all 6 presentation-readiness criteria (Ready to Present).",
                ]);
            }

            return;
        }

        if ($item->category === 'Portfolio Showcase') {
            $hasReadyWeb = DemoProduct::query()
                ->where('service_line', 'Website Development & CMS')
                ->where('is_ready_to_present', true)
                ->exists();
            if (! $hasReadyWeb) {
                throw ValidationException::withMessages([
                    'status' => 'Publication blocked: Portfolio Showcase content requires at least one Website Development & CMS demo marked Ready to Present.',
                ]);
            }
        } elseif ($item->category === 'Demo Product') {
            $hasReadyCustom = DemoProduct::query()
                ->where('service_line', 'Custom Software Development')
                ->where('is_ready_to_present', true)
                ->exists();
            if (! $hasReadyCustom) {
                throw ValidationException::withMessages([
                    'status' => 'Publication blocked: Demo Product content requires at least one Custom Software Development demo marked Ready to Present.',
                ]);
            }
        } elseif ($item->category === 'Case Study') {
            $hasReadyOrClient = DemoProduct::query()
                ->where(function ($q) {
                    $q->where('is_ready_to_present', true)
                        ->orWhere('client_permission_granted', true);
                })
                ->exists();
            if (! $hasReadyOrClient) {
                throw ValidationException::withMessages([
                    'status' => 'Publication blocked: Case Study content requires a Ready-to-Present demo or explicit client permission.',
                ]);
            }
        }
    }
}

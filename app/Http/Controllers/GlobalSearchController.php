<?php

namespace App\Http\Controllers;

use App\Domain\Crm\Models\Lead;
use App\Domain\Governance\Models\Decision;
use App\Domain\Portfolio\Models\DemoProduct;
use App\Domain\Project\Models\Project;
use App\Domain\Workplan\Models\AnnualRoadmap;
use App\Domain\Workplan\Models\Task;
use App\Domain\Workspace\Models\Announcement;
use App\Domain\Workspace\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlobalSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $q = trim($request->string('q')->toString());
        $user = $request->user();

        if ($user === null || mb_strlen($q) < 2) {
            return response()->json(['groups' => []]);
        }

        $like = "%{$q}%";
        $groups = [];

        if ($user->can('tasks.view')) {
            $tasks = Task::query()
                ->where(fn ($sub) => $sub->where('code', 'like', $like)->orWhere('title', 'like', $like))
                ->orderByDesc('updated_at')
                ->limit(5)
                ->get(['id', 'code', 'title', 'status'])
                ->map(fn (Task $t) => [
                    'id' => "task-{$t->id}",
                    'title' => "{$t->code} — {$t->title}",
                    'subtitle' => $t->status,
                    'url' => "/tasks/{$t->id}",
                ])
                ->all();
            if ($tasks !== []) {
                $groups[] = ['module' => 'Tasks', 'items' => $tasks];
            }
        }

        if ($user->can('crm.view')) {
            $leads = Lead::query()
                ->with('company:id,name')
                ->where(fn ($sub) => $sub
                    ->where('code', 'like', $like)
                    ->orWhereHas('company', fn ($c) => $c->where('name', 'like', $like)))
                ->orderByDesc('updated_at')
                ->limit(5)
                ->get(['id', 'code', 'company_id', 'stage'])
                ->map(fn (Lead $l) => [
                    'id' => "lead-{$l->id}",
                    'title' => "{$l->code} — ".($l->company?->name ?? 'Prospect'),
                    'subtitle' => $l->stage,
                    'url' => "/crm/leads/{$l->id}",
                ])
                ->all();
            if ($leads !== []) {
                $groups[] = ['module' => 'Clients & Pipeline', 'items' => $leads];
            }
        }

        if ($user->can('projects.view')) {
            $projects = Project::query()
                ->where(fn ($sub) => $sub->where('code', 'like', $like)->orWhere('name', 'like', $like))
                ->orderByDesc('updated_at')
                ->limit(5)
                ->get(['id', 'code', 'name', 'status'])
                ->map(fn (Project $p) => [
                    'id' => "project-{$p->id}",
                    'title' => "{$p->code} — {$p->name}",
                    'subtitle' => $p->status,
                    'url' => "/projects/{$p->id}",
                ])
                ->all();
            if ($projects !== []) {
                $groups[] = ['module' => 'Projects', 'items' => $projects];
            }
        }

        if ($user->can('workplan.view')) {
            $roadmaps = AnnualRoadmap::query()
                ->where(fn ($sub) => $sub->where('month_label', 'like', $like)->orWhere('primary_focus', 'like', $like)->orWhere('phase_label', 'like', $like))
                ->orderBy('period_month')
                ->limit(4)
                ->get(['id', 'month_label', 'primary_focus'])
                ->map(fn (AnnualRoadmap $r) => [
                    'id' => "roadmap-{$r->id}",
                    'title' => $r->month_label,
                    'subtitle' => $r->primary_focus,
                    'url' => '/workplan/roadmap',
                ])
                ->all();
            if ($roadmaps !== []) {
                $groups[] = ['module' => 'Annual Roadmap', 'items' => $roadmaps];
            }
        }

        if ($user->can('portfolio.view')) {
            $demos = DemoProduct::query()
                ->where(fn ($sub) => $sub->where('code', 'like', $like)->orWhere('name', 'like', $like))
                ->orderByDesc('updated_at')
                ->limit(4)
                ->get(['id', 'code', 'name', 'status'])
                ->map(fn (DemoProduct $d) => [
                    'id' => "demo-{$d->id}",
                    'title' => "{$d->code} — {$d->name}",
                    'subtitle' => $d->status,
                    'url' => "/portfolio/demos/{$d->id}",
                ])
                ->all();
            if ($demos !== []) {
                $groups[] = ['module' => 'Portfolio & Demos', 'items' => $demos];
            }
        }

        if ($user->can('risks.view')) {
            $decisions = Decision::query()
                ->where(fn ($sub) => $sub->where('code', 'like', $like)->orWhere('topic_decision', 'like', $like))
                ->orderByDesc('updated_at')
                ->limit(4)
                ->get(['id', 'code', 'topic_decision', 'status'])
                ->map(fn (Decision $d) => [
                    'id' => "decision-{$d->id}",
                    'title' => "{$d->code} — {$d->topic_decision}",
                    'subtitle' => $d->status,
                    'url' => '/governance/risks-decisions?tab=decisions',
                ])
                ->all();
            if ($decisions !== []) {
                $groups[] = ['module' => 'Decision Log', 'items' => $decisions];
            }
        }

        if ($user->can('documents.view')) {
            $docs = Document::query()
                ->where(fn ($sub) => $sub->where('code', 'like', $like)->orWhere('title', 'like', $like))
                ->orderByDesc('updated_at')
                ->limit(4)
                ->get(['id', 'code', 'title', 'category'])
                ->map(fn (Document $doc) => [
                    'id' => "doc-{$doc->id}",
                    'title' => "{$doc->code} — {$doc->title}",
                    'subtitle' => $doc->category,
                    'url' => '/documents',
                ])
                ->all();
            if ($docs !== []) {
                $groups[] = ['module' => 'Documents', 'items' => $docs];
            }
        }

        $announcements = Announcement::query()
            ->whereNotNull('published_at')
            ->where(fn ($sub) => $sub->where('code', 'like', $like)->orWhere('title', 'like', $like))
            ->orderByDesc('published_at')
            ->limit(3)
            ->get(['id', 'code', 'title', 'priority'])
            ->map(fn (Announcement $a) => [
                'id' => "ann-{$a->id}",
                'title' => "{$a->code} — {$a->title}",
                'subtitle' => $a->priority,
                'url' => '/announcements',
            ])
            ->all();
        if ($announcements !== []) {
            $groups[] = ['module' => 'Announcements', 'items' => $announcements];
        }

        return response()->json(['groups' => $groups]);
    }
}

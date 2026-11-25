<?php

namespace App\Http\Controllers;

use App\Domain\Governance\Models\ActionItem;
use App\Domain\Governance\Models\Decision;
use App\Domain\Governance\Models\Meeting;
use App\Domain\Governance\Models\MeetingForum;
use App\Domain\Governance\Models\QuarterlyReview;
use App\Domain\Governance\Models\Risk;
use App\Domain\Governance\Models\WeeklyReport;
use App\Domain\Governance\Services\MeetingService;
use App\Domain\Governance\Services\RiskAndDecisionService;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MeetingController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewMeetings', Risk::class);

        $forums = MeetingForum::query()->with('pic:id,name')->orderBy('code')->get();
        $meetings = Meeting::query()
            ->with(['pic:id,name', 'minute.recorder:id,name', 'actionItems.pic:id,name', 'decisions:id,code,source_meeting_id,topic_decision'])
            ->orderBy('scheduled_date')
            ->orderBy('code')
            ->get();

        $weeklyReports = WeeklyReport::query()
            ->with('user:id,name')
            ->latest('week_start_date')
            ->limit(30)
            ->get();

        $quarterlyReviews = QuarterlyReview::query()
            ->with('reviewer:id,name')
            ->orderBy('sort_order')
            ->get();

        $users = User::query()->where('is_active', true)->orderBy('id')->get(['id', 'name']);

        return Inertia::render('Governance/Meetings', [
            'forums' => $forums->map(fn (MeetingForum $f) => [
                'id' => $f->id,
                'code' => $f->code,
                'name' => $f->name,
                'purpose' => $f->purpose,
                'frequency' => $f->frequency,
                'duration' => $f->duration,
                'participants' => $f->participants,
                'standard_agenda' => $f->standard_agenda,
                'required_output' => $f->required_output,
                'pic_name' => $f->pic?->name,
            ]),
            'meetings' => $meetings->map(fn (Meeting $m) => [
                'id' => $m->id,
                'code' => $m->code,
                'forum_id' => $m->forum_id,
                'forum_name' => $m->forum_name,
                'focus' => $m->focus,
                'scheduled_date' => $m->scheduled_date?->format('Y-m-d'),
                'scheduled_time' => $m->scheduled_time,
                'status' => $m->status,
                'pic_user_id' => $m->pic_user_id,
                'pic_name' => $m->pic?->name,
                'agenda' => $m->agenda,
                'agenda_sent_at' => $m->agenda_sent_at?->format('Y-m-d H:i'),
                'participants_list' => $m->participants_list,
                'minute' => $m->minute ? [
                    'id' => $m->minute->id,
                    'summary' => $m->minute->summary,
                    'decisions_summary' => $m->minute->decisions_summary,
                    'escalations' => $m->minute->escalations,
                    'recorder' => $m->minute->recorder?->name,
                    'submitted_at' => $m->minute->submitted_at?->format('Y-m-d H:i'),
                    'is_within_24h_sla' => $m->minute->is_within_24h_sla,
                ] : null,
                'action_items' => $m->actionItems->map(fn (ActionItem $a) => [
                    'id' => $a->id,
                    'title' => $a->title,
                    'pic_name' => $a->pic?->name,
                    'due_date' => $a->due_date?->format('Y-m-d'),
                    'evidence_note' => $a->evidence_note,
                    'status' => $a->status,
                ]),
                'decisions' => $m->decisions->map(fn (Decision $d) => [
                    'id' => $d->id,
                    'code' => $d->code,
                    'topic_decision' => $d->topic_decision,
                ]),
            ]),
            'weeklyReports' => $weeklyReports->map(fn (WeeklyReport $w) => [
                'id' => $w->id,
                'user_name' => $w->user?->name,
                'week_start_date' => $w->week_start_date?->format('Y-m-d'),
                'week_label' => $w->week_label,
                'completed_tasks_summary' => $w->completed_tasks_summary,
                'in_progress_summary' => $w->in_progress_summary,
                'blockers_summary' => $w->blockers_summary,
                'next_week_plan' => $w->next_week_plan,
                'submitted_at' => $w->submitted_at?->format('Y-m-d H:i'),
            ]),
            'quarterlyReviews' => $quarterlyReviews->map(fn (QuarterlyReview $q) => [
                'id' => $q->id,
                'quarter_label' => $q->quarter_label,
                'review_focus' => $q->review_focus,
                'period_range' => $q->period_range,
                'score' => $q->score !== null ? (float) $q->score : null,
                'status' => $q->status,
                'key_decisions' => $q->key_decisions,
                'action_plan' => $q->action_plan,
            ]),
            'users' => $users,
            'canManage' => $request->user()?->can('manageMeetings', Risk::class) ?? false,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('manageMeetings', Risk::class);

        $data = $request->validate([
            'forum_id' => ['nullable', 'exists:meeting_forums,id'],
            'forum_name' => ['required', 'string', 'max:120'],
            'focus' => ['required', 'string', 'max:255'],
            'scheduled_date' => ['required', 'date'],
            'scheduled_time' => ['nullable', 'string', 'max:20'],
            'pic_user_id' => ['required', 'exists:users,id'],
            'agenda' => ['nullable', 'string', 'max:3000'],
        ]);

        $maxNum = Meeting::withTrashed()
            ->where('code', 'like', 'MTG-%')
            ->pluck('code')
            ->map(fn (string $c) => (int) str_replace('MTG-', '', $c))
            ->max() ?? 0;

        $hasAgenda = ! empty(trim((string) ($data['agenda'] ?? '')));

        Meeting::create([
            'code' => sprintf('MTG-%03d', $maxNum + 1),
            ...$data,
            'status' => $hasAgenda ? 'Agenda Ready' : 'Planned',
            'agenda_sent_at' => $hasAgenda ? now() : null,
        ]);

        return back()->with('success', 'Meeting scheduled.');
    }

    public function publishAgenda(Request $request, Meeting $meeting, MeetingService $service): RedirectResponse
    {
        $this->authorize('manageMeetings', Risk::class);

        $data = $request->validate([
            'agenda' => ['required', 'string', 'max:3000'],
            'participants_list' => ['nullable', 'string', 'max:1000'],
        ]);

        $service->publishAgenda($meeting, $data['agenda'], $data['participants_list'] ?? null, $request->user());

        return back()->with('success', "Agenda published for {$meeting->code}.");
    }

    public function storeMinutes(Request $request, Meeting $meeting, MeetingService $service): RedirectResponse
    {
        $this->authorize('manageMeetings', Risk::class);

        $data = $request->validate([
            'summary' => ['required', 'string', 'max:5000'],
            'decisions_summary' => ['nullable', 'string', 'max:3000'],
            'escalations' => ['nullable', 'string', 'max:2000'],
        ]);

        $service->recordMinutes($meeting, $data, $request->user());

        return back()->with('success', "Minutes saved for {$meeting->code}.");
    }

    public function storeActionItem(Request $request, Meeting $meeting, MeetingService $service): RedirectResponse
    {
        $this->authorize('manageMeetings', Risk::class);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'pic_user_id' => ['required', 'exists:users,id'],
            'due_date' => ['nullable', 'date'],
            'evidence_note' => ['nullable', 'string', 'max:255'],
        ]);

        $service->addActionItem($meeting, $data, $request->user());

        return back()->with('success', 'Action item added.');
    }

    public function completeActionItem(Request $request, ActionItem $actionItem): RedirectResponse
    {
        $this->authorize('viewMeetings', Risk::class);

        $actionItem->update([
            'status' => 'Completed',
            'completed_at' => now(),
        ]);

        return back()->with('success', 'Action item completed.');
    }

    public function promoteDecision(
        Request $request,
        Meeting $meeting,
        RiskAndDecisionService $service
    ): RedirectResponse {
        $this->authorize('createDecisions', Risk::class);

        $data = $request->validate([
            'topic_decision' => ['required', 'string', 'max:2000'],
            'pic_user_id' => ['required', 'exists:users,id'],
            'deadline' => ['nullable', 'date'],
            'follow_up' => ['nullable', 'string', 'max:1000'],
        ]);

        $decision = $service->createDecision($data, $request->user(), $meeting);

        return back()->with('success', "Promoted to Decision Log as {$decision->code}.");
    }

    public function storeWeeklyReport(Request $request): RedirectResponse
    {
        $this->authorize('viewMeetings', Risk::class);

        $data = $request->validate([
            'week_start_date' => ['required', 'date'],
            'completed_tasks_summary' => ['required', 'string', 'max:3000'],
            'in_progress_summary' => ['required', 'string', 'max:3000'],
            'blockers_summary' => ['nullable', 'string', 'max:2000'],
            'next_week_plan' => ['required', 'string', 'max:3000'],
        ]);

        $weekDate = Carbon::parse($data['week_start_date'])->startOfWeek();

        WeeklyReport::updateOrCreate(
            ['user_id' => $request->user()->id, 'week_start_date' => $weekDate->toDateString()],
            [
                'week_label' => 'Week ' . $weekDate->format('W, Y'),
                'completed_tasks_summary' => $data['completed_tasks_summary'],
                'in_progress_summary' => $data['in_progress_summary'],
                'blockers_summary' => $data['blockers_summary'] ?? null,
                'next_week_plan' => $data['next_week_plan'],
                'submitted_at' => now(),
            ]
        );

        return back()->with('success', 'Weekly Progress Report submitted.');
    }

    public function updateQuarterlyReview(Request $request, QuarterlyReview $quarterlyReview): RedirectResponse
    {
        $this->authorize('manageMeetings', Risk::class);

        $data = $request->validate([
            'score' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'status' => ['required', Rule::in(['Planned', 'In Progress', 'Completed'])],
            'key_decisions' => ['nullable', 'string', 'max:3000'],
            'action_plan' => ['nullable', 'string', 'max:3000'],
        ]);

        $quarterlyReview->update([
            ...$data,
            'reviewed_by' => $request->user()->id,
        ]);

        return back()->with('success', "Quarterly review {$quarterlyReview->quarter_label} updated.");
    }
}

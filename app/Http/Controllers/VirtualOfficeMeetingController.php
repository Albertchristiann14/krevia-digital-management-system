<?php

namespace App\Http\Controllers;

use App\Domain\Governance\Models\ActionItem;
use App\Domain\Governance\Models\Meeting;
use App\Domain\VirtualOffice\Models\OfficePresence;
use App\Domain\VirtualOffice\Services\MeetingRoomService;
use App\Domain\VirtualOffice\Services\PresenceService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VirtualOfficeMeetingController extends Controller
{
    public function index(Request $request, MeetingRoomService $service): JsonResponse
    {
        $zoneId = $request->filled('zone_id') ? (int) $request->input('zone_id') : null;

        return response()->json([
            'ok' => true,
            'meetings' => $service->listMeetingsForOffice($zoneId),
        ]);
    }

    public function slots(Request $request, MeetingRoomService $service): JsonResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date'],
            'zone_id' => ['required', 'integer', 'exists:office_zones,id'],
        ]);

        return response()->json([
            'ok' => true,
            'slots' => $service->timelineSlots((string) $data['date'], (int) $data['zone_id']),
        ]);
    }

    public function startInstant(Request $request, MeetingRoomService $service, PresenceService $presenceService): JsonResponse
    {
        $data = $request->validate([
            'focus' => ['required', 'string', 'max:200'],
            'agenda' => ['nullable', 'string', 'max:2000'],
            'zone_id' => ['nullable', 'integer', 'exists:office_zones,id'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'duration_minutes' => ['nullable', 'integer', 'min:15', 'max:240'],
            'is_locked' => ['sometimes', 'boolean'],
            'invite_user_ids' => ['nullable', 'array'],
            'invite_user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $meeting = $service->startInstantMeeting($request->user(), $data);
        $presence = OfficePresence::query()
            ->where('user_id', $request->user()->id)
            ->with(['zone:id,slug,name', 'seat:id,seat_key'])
            ->first();

        return response()->json([
            'ok' => true,
            'meeting' => $meeting,
            'meetings' => $service->listMeetingsForOffice(),
            'myPresence' => $presence ? $presenceService->serializePresence($presence) : null,
        ]);
    }

    public function schedule(Request $request, MeetingRoomService $service): JsonResponse
    {
        $data = $request->validate([
            'focus' => ['required', 'string', 'max:200'],
            'scheduled_date' => ['required', 'date'],
            'scheduled_time' => ['required', 'string', 'max:20'],
            'duration_minutes' => ['nullable', 'integer', 'min:15', 'max:240'],
            'zone_id' => ['nullable', 'integer', 'exists:office_zones,id'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'agenda' => ['nullable', 'string', 'max:2000'],
            'is_locked' => ['sometimes', 'boolean'],
            'invite_user_ids' => ['nullable', 'array'],
            'invite_user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $meeting = $service->scheduleMeeting($request->user(), $data);

        return response()->json([
            'ok' => true,
            'meeting' => $meeting,
            'meetings' => $service->listMeetingsForOffice(),
        ]);
    }

    public function join(Request $request, Meeting $meeting, MeetingRoomService $service, PresenceService $presenceService): JsonResponse
    {
        $updated = $service->joinMeeting($meeting, $request->user());
        $presence = OfficePresence::query()
            ->where('user_id', $request->user()->id)
            ->with(['zone:id,slug,name', 'seat:id,seat_key'])
            ->first();

        return response()->json([
            'ok' => true,
            'meeting' => $updated,
            'meetings' => $service->listMeetingsForOffice(),
            'myPresence' => $presence ? $presenceService->serializePresence($presence) : null,
        ]);
    }

    public function leave(Request $request, Meeting $meeting, MeetingRoomService $service): JsonResponse
    {
        $updated = $service->leaveMeeting($meeting, $request->user());

        return response()->json([
            'ok' => true,
            'meeting' => $updated,
            'meetings' => $service->listMeetingsForOffice(),
        ]);
    }

    public function end(Request $request, Meeting $meeting, MeetingRoomService $service): JsonResponse
    {
        $updated = $service->endMeeting($meeting, $request->user());

        return response()->json([
            'ok' => true,
            'meeting' => $updated,
            'meetings' => $service->listMeetingsForOffice(),
        ]);
    }

    public function rsvp(Request $request, Meeting $meeting, MeetingRoomService $service): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(['accepted', 'maybe', 'declined'])],
        ]);

        $updated = $service->rsvp($meeting, $request->user(), $data['status']);

        return response()->json([
            'ok' => true,
            'meeting' => $updated,
            'meetings' => $service->listMeetingsForOffice(),
        ]);
    }

    public function saveNotes(Request $request, Meeting $meeting, MeetingRoomService $service): JsonResponse
    {
        $data = $request->validate([
            'summary' => ['required', 'string', 'max:5000'],
            'decisions_summary' => ['nullable', 'string', 'max:3000'],
            'escalations' => ['nullable', 'string', 'max:2000'],
        ]);

        $updated = $service->saveNotes($meeting, $request->user(), $data);

        return response()->json([
            'ok' => true,
            'meeting' => $updated,
            'meetings' => $service->listMeetingsForOffice(),
        ]);
    }

    public function addActionItem(Request $request, Meeting $meeting, MeetingRoomService $service): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'pic_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'due_date' => ['nullable', 'date'],
        ]);

        $updated = $service->addActionItem($meeting, $request->user(), $data);

        return response()->json([
            'ok' => true,
            'meeting' => $updated,
            'meetings' => $service->listMeetingsForOffice(),
        ]);
    }

    public function convertToTask(Request $request, ActionItem $actionItem, MeetingRoomService $service): JsonResponse
    {
        $result = $service->convertActionItemToTask($actionItem, $request->user());

        return response()->json([
            'ok' => true,
            'task' => $result['task'],
            'meeting' => $result['meeting'],
            'meetings' => $service->listMeetingsForOffice(),
        ]);
    }

    public function quickCall(Request $request, User $user, MeetingRoomService $service): JsonResponse
    {
        $result = $service->startQuickCall($request->user(), $user);

        return response()->json([
            'ok' => true,
            'call' => $result,
        ]);
    }

    public function events(Request $request, MeetingRoomService $service): JsonResponse
    {
        $zoneId = $request->filled('zone_id') ? (int) $request->input('zone_id') : null;

        return response()->json([
            'ok' => true,
            'events' => $service->listEvents($zoneId, 40),
        ]);
    }
}

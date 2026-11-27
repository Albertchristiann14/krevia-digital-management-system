<?php

namespace App\Http\Controllers;

use App\Domain\VirtualOffice\Models\OfficeVisitor;
use App\Domain\VirtualOffice\Services\PresenceService;
use App\Domain\VirtualOffice\Services\WorkspaceObjectService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VirtualOfficeObjectController extends Controller
{
    public function visitors(WorkspaceObjectService $service): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'visitors' => $service->listActiveVisitors(),
        ]);
    }

    public function checkInVisitor(Request $request, WorkspaceObjectService $service): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'company_name' => ['nullable', 'string', 'max:160'],
            'company_id' => ['nullable', 'integer', 'exists:companies,id'],
            'contact_id' => ['nullable', 'integer', 'exists:contacts,id'],
            'purpose' => ['required', 'string', 'max:255'],
            'host_user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $visitor = $service->checkInVisitor($request->user(), $data);

        return response()->json([
            'ok' => true,
            'visitor' => $visitor,
            'visitors' => $service->listActiveVisitors(),
        ]);
    }

    public function respondVisitor(Request $request, OfficeVisitor $visitor, WorkspaceObjectService $service): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', 'string', Rule::in(['admit', 'delay', 'checkout'])],
            'zone_id' => ['nullable', 'integer', 'exists:office_zones,id'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $updated = $service->respondVisitor(
            $visitor,
            $request->user(),
            $data['action'],
            isset($data['zone_id']) ? (int) $data['zone_id'] : null,
            $data['note'] ?? null,
        );

        return response()->json([
            'ok' => true,
            'visitor' => $updated,
            'visitors' => $service->listActiveVisitors(),
        ]);
    }

    public function projectKanban(Request $request, WorkspaceObjectService $service): JsonResponse
    {
        $projectId = $request->filled('project_id') ? (int) $request->input('project_id') : null;

        return response()->json([
            'ok' => true,
            'kanban' => $service->projectKanban($request->user(), $projectId),
        ]);
    }

    public function inviteCoffee(Request $request, User $user, WorkspaceObjectService $service): JsonResponse
    {
        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:160'],
        ]);

        $result = $service->inviteCoffee($request->user(), $user, $data['note'] ?? null);

        return response()->json([
            'ok' => true,
            'result' => $result,
        ]);
    }

    public function breakTime(Request $request, WorkspaceObjectService $service, PresenceService $presenceService): JsonResponse
    {
        $presence = $service->startBreakTime($request->user());

        return response()->json([
            'ok' => true,
            'myPresence' => $presenceService->serializePresence($presence),
        ]);
    }

    public function focusMode(Request $request, WorkspaceObjectService $service, PresenceService $presenceService): JsonResponse
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $presence = $service->toggleFocusMode($request->user(), (bool) $data['enabled']);

        return response()->json([
            'ok' => true,
            'myPresence' => $presenceService->serializePresence($presence),
        ]);
    }
}

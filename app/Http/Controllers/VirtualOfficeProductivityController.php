<?php

namespace App\Http\Controllers;

use App\Domain\VirtualOffice\Models\OfficeZone;
use App\Domain\VirtualOffice\Services\TeamProductivityService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VirtualOfficeProductivityController extends Controller
{
    public function standups(Request $request, TeamProductivityService $service): JsonResponse
    {
        $date = $request->filled('date') ? (string) $request->input('date') : null;

        return response()->json([
            'ok' => true,
            'standups' => $service->listStandups($date),
        ]);
    }

    public function startStandup(Request $request, TeamProductivityService $service): JsonResponse
    {
        $service->startStandup($request->user());

        return response()->json([
            'ok' => true,
            'standups' => $service->listStandups(),
        ]);
    }

    public function submitStandup(Request $request, TeamProductivityService $service): JsonResponse
    {
        $data = $request->validate([
            'yesterday' => ['required', 'string', 'max:1500'],
            'today' => ['required', 'string', 'max:1500'],
            'blockers' => ['nullable', 'string', 'max:1000'],
        ]);

        $entry = $service->submitStandup($request->user(), $data);

        return response()->json([
            'ok' => true,
            'standup' => $entry,
            'standups' => $service->listStandups(),
        ]);
    }

    public function attendanceHeatmap(Request $request, TeamProductivityService $service): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'heatmap' => $service->attendanceHeatmap($request->user()),
        ]);
    }

    public function summon(Request $request, TeamProductivityService $service): JsonResponse
    {
        $data = $request->validate([
            'target_user_id' => ['required', 'integer', 'exists:users,id'],
            'zone_id' => ['required', 'integer', 'exists:office_zones,id'],
            'note' => ['nullable', 'string', 'max:180'],
        ]);

        $target = User::query()->findOrFail($data['target_user_id']);
        $zone = OfficeZone::query()->whereKey($data['zone_id'])->where('is_active', true)->firstOrFail();

        $payload = $service->summonMember($request->user(), $target, $zone, $data['note'] ?? null);

        return response()->json([
            'ok' => true,
            'summon' => $payload,
        ]);
    }

    public function updateZone(Request $request, OfficeZone $zone, TeamProductivityService $service): JsonResponse
    {
        $data = $request->validate([
            'capacity' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'linked_project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $updated = $service->updateZoneSettings($request->user(), $zone, $data);

        return response()->json([
            'ok' => true,
            'zone' => $updated,
        ]);
    }
}

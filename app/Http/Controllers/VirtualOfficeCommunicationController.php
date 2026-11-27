<?php

namespace App\Http\Controllers;

use App\Domain\VirtualOffice\Models\OfficeKnock;
use App\Domain\VirtualOffice\Models\OfficeMessage;
use App\Domain\VirtualOffice\Services\CommunicationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VirtualOfficeCommunicationController extends Controller
{
    public function messages(Request $request, CommunicationService $comms): JsonResponse
    {
        $data = $request->validate([
            'scope' => ['required', Rule::in(['zone', 'dm'])],
            'zone_id' => ['required_if:scope,zone', 'nullable', 'integer', 'exists:office_zones,id'],
            'user_id' => ['required_if:scope,dm', 'nullable', 'integer', 'exists:users,id'],
            'before_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $result = $comms->listMessages(
            $request->user(),
            $data['scope'],
            isset($data['zone_id']) ? (int) $data['zone_id'] : null,
            isset($data['user_id']) ? (int) $data['user_id'] : null,
            isset($data['before_id']) ? (int) $data['before_id'] : null,
        );

        return response()->json([
            'ok' => true,
            ...$result,
            'unread' => $comms->unreadCounts($request->user()),
        ]);
    }

    public function storeMessage(Request $request, CommunicationService $comms): JsonResponse
    {
        $data = $request->validate([
            'scope' => ['required', Rule::in(['zone', 'dm'])],
            'zone_id' => ['required_if:scope,zone', 'nullable', 'integer', 'exists:office_zones,id'],
            'recipient_id' => ['required_if:scope,dm', 'nullable', 'integer', 'exists:users,id'],
            'body' => ['required', 'string', 'max:2000'],
            'reply_to_id' => ['nullable', 'integer', 'exists:office_messages,id'],
            'is_urgent' => ['sometimes', 'boolean'],
        ]);

        $message = $comms->sendMessage($request->user(), $data);

        return response()->json([
            'ok' => true,
            'message' => $comms->serializeMessage($message),
        ], 201);
    }

    public function updateMessage(Request $request, OfficeMessage $message, CommunicationService $comms): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $updated = $comms->editMessage($request->user(), $message, $data['body']);

        return response()->json([
            'ok' => true,
            'message' => $comms->serializeMessage($updated),
        ]);
    }

    public function destroyMessage(Request $request, OfficeMessage $message, CommunicationService $comms): JsonResponse
    {
        $comms->deleteMessage($request->user(), $message);

        return response()->json(['ok' => true]);
    }

    public function reactMessage(Request $request, OfficeMessage $message, CommunicationService $comms): JsonResponse
    {
        $data = $request->validate([
            'emoji' => ['required', 'string', 'max:16'],
        ]);

        $updated = $comms->toggleReaction($request->user(), $message, $data['emoji']);

        return response()->json([
            'ok' => true,
            'message' => $comms->serializeMessage($updated),
        ]);
    }

    public function markRead(Request $request, CommunicationService $comms): JsonResponse
    {
        $data = $request->validate([
            'scope' => ['required', Rule::in(['zone', 'dm'])],
            'zone_id' => ['required_if:scope,zone', 'nullable', 'integer', 'exists:office_zones,id'],
            'user_id' => ['required_if:scope,dm', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $comms->markRead(
            $request->user(),
            $data['scope'],
            isset($data['zone_id']) ? (int) $data['zone_id'] : null,
            isset($data['user_id']) ? (int) $data['user_id'] : null,
        );

        return response()->json([
            'ok' => true,
            'unread' => $comms->unreadCounts($request->user()),
        ]);
    }

    public function knocks(Request $request, CommunicationService $comms): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'knocks' => $comms->pendingKnocksFor($request->user()),
        ]);
    }

    public function sendKnock(Request $request, CommunicationService $comms): JsonResponse
    {
        $data = $request->validate([
            'to_user_id' => ['required', 'integer', 'exists:users,id'],
            'message' => ['nullable', 'string', 'max:200'],
        ]);

        $knock = $comms->sendKnock(
            $request->user(),
            (int) $data['to_user_id'],
            $data['message'] ?? null,
        );

        return response()->json([
            'ok' => true,
            'knock' => $comms->serializeKnock($knock),
        ], 201);
    }

    public function respondKnock(Request $request, OfficeKnock $knock, CommunicationService $comms): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['accepted', 'declined', 'later'])],
        ]);

        $updated = $comms->respondKnock($request->user(), $knock, $data['status']);

        return response()->json([
            'ok' => true,
            'knock' => $comms->serializeKnock($updated),
        ]);
    }
}

<?php

namespace App\Domain\VirtualOffice\Services;

use App\Domain\VirtualOffice\Events\OfficeKnockEvent;
use App\Domain\VirtualOffice\Events\OfficeMessageSent;
use App\Domain\VirtualOffice\Models\OfficeEvent;
use App\Domain\VirtualOffice\Models\OfficeKnock;
use App\Domain\VirtualOffice\Models\OfficeMessage;
use App\Domain\VirtualOffice\Models\OfficeMessageRead;
use App\Domain\VirtualOffice\Models\OfficePresence;
use App\Domain\VirtualOffice\Models\OfficeZone;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class CommunicationService
{
    public function listMessages(User $user, string $scope, ?int $zoneId, ?int $otherUserId, ?int $beforeId = null, int $limit = 30): array
    {
        $query = OfficeMessage::query()
            ->with(['sender:id,name,avatar_path,updated_at', 'sender.employeeProfile:id,user_id,avatar_color', 'replyTo.sender:id,name'])
            ->where('scope', $scope);

        if ($scope === 'zone') {
            $query->where('zone_id', $zoneId);
        } elseif ($scope === 'dm') {
            $query->where(function ($q) use ($user, $otherUserId) {
                $q->where(function ($q2) use ($user, $otherUserId) {
                    $q2->where('sender_id', $user->id)->where('recipient_id', $otherUserId);
                })->orWhere(function ($q2) use ($user, $otherUserId) {
                    $q2->where('sender_id', $otherUserId)->where('recipient_id', $user->id);
                });
            });
        }

        if ($beforeId) {
            $query->where('id', '<', $beforeId);
        }

        $rows = $query->orderByDesc('id')->limit($limit + 1)->get();
        $hasMore = $rows->count() > $limit;
        $items = $rows->take($limit)->reverse()->values();

        return [
            'messages' => $items->map(fn (OfficeMessage $m) => $this->serializeMessage($m))->all(),
            'has_more' => $hasMore,
        ];
    }

    public function sendMessage(User $sender, array $data): OfficeMessage
    {
        $scope = $data['scope'];
        $cleanBody = trim(strip_tags((string) $data['body']));
        if ($cleanBody === '') {
            throw ValidationException::withMessages(['body' => 'Pesan tidak boleh kosong.']);
        }

        $isUrgent = false;
        $silentDnd = false;

        if ($scope === 'zone') {
            $zone = OfficeZone::whereKey($data['zone_id'] ?? 0)->where('is_active', true)->first();
            if (! $zone) {
                throw ValidationException::withMessages(['zone_id' => 'Zona tidak ditemukan.']);
            }
        }

        if ($scope === 'dm') {
            $recipient = User::whereKey($data['recipient_id'] ?? 0)->where('is_active', true)->first();
            if (! $recipient) {
                throw ValidationException::withMessages(['recipient_id' => 'Penerima tidak ditemukan.']);
            }
            if ((int) $recipient->id === (int) $sender->id) {
                throw ValidationException::withMessages(['recipient_id' => 'Tidak dapat mengirim DM ke diri sendiri.']);
            }

            $canMarkUrgent = $sender->hasAnyRole([User::ROLE_FOUNDER, User::ROLE_OPERATIONS]) || $sender->can('organization.manage');
            $isUrgent = $canMarkUrgent && ! empty($data['is_urgent']);

            $recipientPresence = OfficePresence::where('user_id', $recipient->id)->first();
            if ($recipientPresence && $recipientPresence->effectiveStatus() === 'dnd' && ! $isUrgent) {
                $silentDnd = true;
            }
        }

        $message = OfficeMessage::create([
            'scope' => $scope,
            'zone_id' => $scope === 'zone' ? (int) $data['zone_id'] : null,
            'recipient_id' => $scope === 'dm' ? (int) $data['recipient_id'] : null,
            'sender_id' => $sender->id,
            'body' => $cleanBody,
            'reply_to_id' => $data['reply_to_id'] ?? null,
            'is_urgent' => $isUrgent,
        ]);

        OfficeMessageRead::updateOrCreate(
            ['message_id' => $message->id, 'user_id' => $sender->id],
            ['read_at' => now()]
        );

        $serialized = $this->serializeMessage($message, $silentDnd);

        try {
            broadcast(new OfficeMessageSent($serialized, 'message.new'));
        } catch (\Throwable $e) {
            Log::warning('[VirtualOffice] Message broadcast skipped: '.$e->getMessage());
        }

        return $message;
    }

    public function editMessage(User $user, OfficeMessage $message, string $body): OfficeMessage
    {
        if ((int) $message->sender_id !== (int) $user->id) {
            abort(403, 'Anda hanya dapat mengedit pesan Anda sendiri.');
        }

        $cleanBody = trim(strip_tags($body));
        if ($cleanBody === '') {
            throw ValidationException::withMessages(['body' => 'Pesan tidak boleh kosong.']);
        }

        $message->update([
            'body' => $cleanBody,
            'edited_at' => now(),
        ]);

        try {
            broadcast(new OfficeMessageSent($this->serializeMessage($message), 'message.edited'));
        } catch (\Throwable $e) {
            Log::warning('[VirtualOffice] Edit broadcast skipped: '.$e->getMessage());
        }

        return $message;
    }

    public function deleteMessage(User $user, OfficeMessage $message): void
    {
        $isAdmin = $user->hasAnyRole([User::ROLE_FOUNDER, User::ROLE_OPERATIONS]) || $user->can('organization.manage');
        if ((int) $message->sender_id !== (int) $user->id && ! $isAdmin) {
            abort(403, 'Tidak memiliki izin untuk menghapus pesan ini.');
        }

        $serialized = $this->serializeMessage($message);
        $message->delete();

        try {
            broadcast(new OfficeMessageSent($serialized, 'message.deleted'));
        } catch (\Throwable $e) {
            Log::warning('[VirtualOffice] Delete broadcast skipped: '.$e->getMessage());
        }
    }

    public function toggleReaction(User $user, OfficeMessage $message, string $emoji): OfficeMessage
    {
        if (! in_array($emoji, OfficeMessage::ALLOWED_REACTIONS, true)) {
            throw ValidationException::withMessages(['emoji' => 'Emoji reaksi tidak didukung.']);
        }

        $reactions = $message->reactions ?? [];
        $users = $reactions[$emoji] ?? [];

        if (in_array($user->id, $users, true)) {
            $users = array_values(array_filter($users, fn ($id) => (int) $id !== (int) $user->id));
        } else {
            $users[] = $user->id;
        }

        if ($users === []) {
            unset($reactions[$emoji]);
        } else {
            $reactions[$emoji] = $users;
        }

        $message->update(['reactions' => $reactions ?: null]);

        try {
            broadcast(new OfficeMessageSent($this->serializeMessage($message), 'message.edited'));
        } catch (\Throwable $e) {
            Log::warning('[VirtualOffice] React broadcast skipped: '.$e->getMessage());
        }

        return $message;
    }

    public function markRead(User $user, string $scope, ?int $zoneId, ?int $otherUserId): void
    {
        $query = OfficeMessage::query()
            ->where('scope', $scope)
            ->where('sender_id', '!=', $user->id);

        if ($scope === 'zone') {
            $query->where('zone_id', $zoneId);
        } elseif ($scope === 'dm') {
            $query->where('sender_id', $otherUserId)->where('recipient_id', $user->id);
        }

        $unreadIds = $query
            ->whereDoesntHave('reads', fn ($q) => $q->where('user_id', $user->id))
            ->pluck('id');

        $now = now();
        foreach ($unreadIds as $msgId) {
            OfficeMessageRead::firstOrCreate(
                ['message_id' => $msgId, 'user_id' => $user->id],
                ['read_at' => $now]
            );
        }
    }

    public function unreadCounts(User $user): array
    {
        $dmUnread = OfficeMessage::query()
            ->where('scope', 'dm')
            ->where('recipient_id', $user->id)
            ->whereDoesntHave('reads', fn ($q) => $q->where('user_id', $user->id))
            ->selectRaw('sender_id, COUNT(*) as total')
            ->groupBy('sender_id')
            ->pluck('total', 'sender_id')
            ->all();

        $zoneUnread = OfficeMessage::query()
            ->where('scope', 'zone')
            ->where('sender_id', '!=', $user->id)
            ->whereDoesntHave('reads', fn ($q) => $q->where('user_id', $user->id))
            ->selectRaw('zone_id, COUNT(*) as total')
            ->groupBy('zone_id')
            ->pluck('total', 'zone_id')
            ->all();

        return [
            'dm' => $dmUnread,
            'zone' => $zoneUnread,
        ];
    }

    public function sendKnock(User $from, int $toUserId, ?string $messageText = null): OfficeKnock
    {
        if ((int) $from->id === $toUserId) {
            throw ValidationException::withMessages(['to_user_id' => 'Tidak dapat mengetuk diri sendiri.']);
        }

        $target = User::whereKey($toUserId)->where('is_active', true)->first();
        if (! $target) {
            throw ValidationException::withMessages(['to_user_id' => 'Anggota tidak ditemukan.']);
        }

        $recentCount = OfficeKnock::query()
            ->where('from_user_id', $from->id)
            ->where('to_user_id', $target->id)
            ->where('created_at', '>=', now()->subHour())
            ->count();

        if ($recentCount >= OfficeKnock::RATE_LIMIT_PER_HOUR) {
            throw ValidationException::withMessages([
                'to_user_id' => 'Batas ketukan tercapai (maksimal 3 ketukan per jam untuk anggota yang sama).',
            ]);
        }

        $cleanMessage = $messageText !== null
            ? mb_substr(trim(strip_tags($messageText)), 0, 200)
            : null;

        $knock = OfficeKnock::create([
            'from_user_id' => $from->id,
            'to_user_id' => $target->id,
            'message' => $cleanMessage !== '' ? $cleanMessage : null,
            'status' => 'pending',
            'expires_at' => now()->addMinutes(OfficeKnock::EXPIRY_MINUTES),
        ]);

        OfficeEvent::create([
            'type' => 'knock.new',
            'actor_id' => $from->id,
            'payload' => ['to_user_id' => $target->id, 'to_name' => $target->name],
            'created_at' => now(),
        ]);

        $targetPresence = OfficePresence::where('user_id', $target->id)->first();
        $isDnd = $targetPresence && $targetPresence->effectiveStatus() === 'dnd';

        try {
            broadcast(new OfficeKnockEvent($this->serializeKnock($knock, $isDnd), 'knock.new'));
        } catch (\Throwable $e) {
            Log::warning('[VirtualOffice] Knock broadcast skipped: '.$e->getMessage());
        }

        return $knock;
    }

    public function respondKnock(User $recipient, OfficeKnock $knock, string $status): OfficeKnock
    {
        if ((int) $knock->to_user_id !== (int) $recipient->id) {
            abort(403, 'Anda tidak berhak merespons ketukan ini.');
        }

        if ($knock->status !== 'pending') {
            throw ValidationException::withMessages(['status' => 'Ketukan ini sudah direspons.']);
        }

        if ($knock->expires_at->isPast()) {
            $knock->update(['status' => 'expired']);
            throw ValidationException::withMessages(['status' => 'Ketukan ini sudah kedaluwarsa.']);
        }

        $knock->update([
            'status' => $status,
            'responded_at' => now(),
        ]);

        try {
            broadcast(new OfficeKnockEvent($this->serializeKnock($knock), 'knock.response'));
        } catch (\Throwable $e) {
            Log::warning('[VirtualOffice] Knock response broadcast skipped: '.$e->getMessage());
        }

        return $knock;
    }

    public function pendingKnocksFor(User $user): array
    {
        // Auto-expire past pending knocks
        OfficeKnock::query()
            ->where('status', 'pending')
            ->where('expires_at', '<', now())
            ->update(['status' => 'expired']);

        return OfficeKnock::query()
            ->with(['fromUser:id,name,avatar_path,updated_at', 'toUser:id,name'])
            ->where('to_user_id', $user->id)
            ->where('status', 'pending')
            ->latest('id')
            ->limit(10)
            ->get()
            ->map(fn (OfficeKnock $k) => $this->serializeKnock($k))
            ->all();
    }

    public function serializeMessage(OfficeMessage $message, bool $silentDnd = false): array
    {
        $message->loadMissing(['sender:id,name,avatar_path,updated_at', 'sender.employeeProfile:id,user_id,avatar_color', 'replyTo.sender:id,name']);

        return [
            'id' => $message->id,
            'scope' => $message->scope,
            'zone_id' => $message->zone_id,
            'recipient_id' => $message->recipient_id,
            'sender_id' => $message->sender_id,
            'sender_name' => $message->sender?->name ?? 'Member',
            'sender_avatar_url' => $message->sender?->avatarUrl(),
            'sender_avatar_color' => $message->sender?->employeeProfile?->avatar_color ?? '#2563EB',
            'body' => $message->body,
            'reactions' => $message->reactions ?? [],
            'is_urgent' => (bool) $message->is_urgent,
            'silent_dnd' => $silentDnd,
            'reply_to' => $message->replyTo ? [
                'id' => $message->replyTo->id,
                'sender_name' => $message->replyTo->sender?->name ?? 'Member',
                'body' => mb_substr($message->replyTo->body, 0, 80),
            ] : null,
            'edited_at' => $message->edited_at?->toIso8601String(),
            'created_at' => $message->created_at?->toIso8601String(),
            'time_label' => $message->created_at?->timezone('Asia/Jakarta')->format('H:i'),
        ];
    }

    public function serializeKnock(OfficeKnock $knock, bool $silentDnd = false): array
    {
        $knock->loadMissing(['fromUser:id,name,avatar_path,updated_at', 'toUser:id,name']);

        return [
            'id' => $knock->id,
            'from_user_id' => $knock->from_user_id,
            'from_name' => $knock->fromUser?->name ?? 'Member',
            'from_avatar_url' => $knock->fromUser?->avatarUrl(),
            'to_user_id' => $knock->to_user_id,
            'to_name' => $knock->toUser?->name ?? 'Member',
            'message' => $knock->message,
            'status' => $knock->status,
            'silent_dnd' => $silentDnd,
            'expires_at' => $knock->expires_at?->toIso8601String(),
            'created_at' => $knock->created_at?->toIso8601String(),
        ];
    }
}

<?php

namespace App\Domain\VirtualOffice\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OfficeTeamPulseUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public readonly string $eventType,
        public readonly array $payload,
        public readonly ?int $targetUserId = null,
    ) {}

    public function broadcastOn(): array
    {
        if ($this->targetUserId) {
            return [new PrivateChannel("office.dm.{$this->targetUserId}")];
        }

        return [new PresenceChannel('office.presence')];
    }

    public function broadcastAs(): string
    {
        return $this->eventType;
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'payload' => $this->payload,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}

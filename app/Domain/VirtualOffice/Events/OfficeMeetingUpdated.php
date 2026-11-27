<?php

namespace App\Domain\VirtualOffice\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OfficeMeetingUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array<string, mixed>  $meeting
     */
    public function __construct(
        public readonly string $action,
        public readonly array $meeting,
        public readonly ?int $zoneId = null,
    ) {}

    public function broadcastOn(): array
    {
        $channels = [new PresenceChannel('office.presence')];

        if ($this->zoneId) {
            $channels[] = new PrivateChannel("office.zone.{$this->zoneId}");
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'meeting.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'meeting' => $this->meeting,
            'zone_id' => $this->zoneId,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}

<?php

namespace App\Domain\VirtualOffice\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OfficeVisitorUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array<string, mixed>  $visitor
     */
    public function __construct(
        public readonly string $action,
        public readonly array $visitor,
        public readonly int $hostUserId,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PresenceChannel('office.presence'),
            new PrivateChannel("office.dm.{$this->hostUserId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'visitor.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'visitor' => $this->visitor,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}

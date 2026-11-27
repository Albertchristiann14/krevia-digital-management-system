<?php

namespace App\Domain\VirtualOffice\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MemberMoved implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public array $presence,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PresenceChannel('office.presence'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'member.moved';
    }

    public function broadcastWith(): array
    {
        return [
            'presence' => $this->presence,
        ];
    }
}

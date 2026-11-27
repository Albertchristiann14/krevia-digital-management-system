<?php

namespace App\Domain\VirtualOffice\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OfficeKnockEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public array $knock,
        public string $eventType = 'knock.new',
    ) {}

    public function broadcastOn(): array
    {
        $targetUserId = $this->eventType === 'knock.new'
            ? $this->knock['to_user_id']
            : $this->knock['from_user_id'];

        return [
            new PrivateChannel('office.dm.'.$targetUserId),
        ];
    }

    public function broadcastAs(): string
    {
        return $this->eventType;
    }

    public function broadcastWith(): array
    {
        return [
            'knock' => $this->knock,
        ];
    }
}

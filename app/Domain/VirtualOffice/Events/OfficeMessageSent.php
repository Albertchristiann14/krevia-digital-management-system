<?php

namespace App\Domain\VirtualOffice\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OfficeMessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public array $message,
        public string $eventType = 'message.new',
    ) {}

    public function broadcastOn(): array
    {
        $scope = $this->message['scope'] ?? 'zone';

        if ($scope === 'dm') {
            $channels = [new PrivateChannel('office.dm.'.$this->message['recipient_id'])];
            if ((int) $this->message['sender_id'] !== (int) $this->message['recipient_id']) {
                $channels[] = new PrivateChannel('office.dm.'.$this->message['sender_id']);
            }

            return $channels;
        }

        if ($scope === 'zone' && ! empty($this->message['zone_id'])) {
            return [new PrivateChannel('office.zone.'.$this->message['zone_id'])];
        }

        return [];
    }

    public function broadcastAs(): string
    {
        return $this->eventType;
    }

    public function broadcastWith(): array
    {
        return [
            'message' => $this->message,
        ];
    }
}

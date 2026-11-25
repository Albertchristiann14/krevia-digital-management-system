<?php

namespace App\Notifications;

use App\Domain\Workplan\Models\Task;
use App\Notifications\Concerns\SupportsMultiChannelDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskNotification extends Notification
{
    use Queueable, SupportsMultiChannelDelivery;

    public function __construct(
        public readonly string $category,
        public readonly string $priority,
        public readonly Task $task,
        public readonly string $message,
    ) {}

    public function whatsappSubject(): string
    {
        return "Task {$this->task->code}";
    }

    public function toMail(object $notifiable): MailMessage
    {
        return $this->buildKdmsMail(
            "Task {$this->task->code} ({$this->task->priority})",
            $this->message,
            'Lihat Task',
            "/tasks/{$this->task->id}"
        );
    }

    public function toWhatsApp(object $notifiable): string
    {
        return "*[KDMS Task · {$this->task->code}]*\n{$this->message}\nDeadline: " . ($this->task->deadline?->format('Y-m-d') ?? '-');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'category' => $this->category,
            'priority' => $this->priority,
            'task_id' => $this->task->id,
            'task_code' => $this->task->code,
            'task_title' => $this->task->title,
            'deadline' => $this->task->deadline?->format('Y-m-d'),
            'message' => $this->message,
            'url' => "/tasks/{$this->task->id}",
        ];
    }
}

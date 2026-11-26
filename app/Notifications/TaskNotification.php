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
        $isAssignment = in_array(strtolower($this->category), ['assigned', 'assignment', 'task_assigned'], true);
        $subject = $isAssignment
            ? "[DMS] New Task Assigned: {$this->task->title}"
            : "[DMS] Task Reminder: {$this->task->title}";

        $picName = $this->task->relationLoaded('pic') ? $this->task->pic?->name : null;

        return $this->buildKdmsViewMail(
            $subject,
            'emails.notifications.task',
            [
                'preheader' => mb_strimwidth($this->message, 0, 110, '...'),
                'categoryBadge' => $isAssignment ? 'Task Assignment' : 'Task Reminder',
                'headline' => $this->task->title,
                'recipientName' => $notifiable->name ?? 'Tim Krevia Digital',
                'introText' => $isAssignment
                    ? 'Anda mendapatkan penugasan task baru di Krevia Digital DMS:'
                    : 'Pengingat terkait task berikut di Krevia Digital DMS:',
                'messageText' => $this->message,
                'details' => array_filter([
                    'Kode Task' => $this->task->code,
                    'Status' => $this->task->status,
                    'Prioritas' => $this->task->priority,
                    'Deadline' => $this->task->deadline?->format('d M Y'),
                    'PIC' => $picName,
                ]),
                'actionLabel' => $isAssignment ? 'View Task' : 'Open Task',
                'actionUrl' => route('tasks.show', $this->task),
            ]
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

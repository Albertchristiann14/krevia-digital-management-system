<?php

namespace App\Http\Requests\Workplan;

use App\Domain\Workplan\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('tasks.create') || $this->user()?->can('tasks.manage') || false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:3000'],
            'expected_result' => ['nullable', 'string', 'max:2000'],
            'pic_user_id' => ['required', 'exists:users,id'],
            'reviewer_user_id' => ['nullable', 'exists:users,id'],
            'priority' => ['required', Rule::in(Task::PRIORITIES)],
            'start_date' => ['nullable', 'date'],
            'deadline' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'stage_label' => ['nullable', 'string', 'max:150'],
        ];
    }
}

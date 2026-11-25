<?php

namespace App\Http\Requests\Workplan;

use App\Domain\Workplan\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        $task = $this->route('task');

        return $task ? ($this->user()?->can('update', $task) ?? false) : false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:3000'],
            'expected_result' => ['nullable', 'string', 'max:2000'],
            'pic_user_id' => ['sometimes', 'required', 'exists:users,id'],
            'reviewer_user_id' => ['nullable', 'exists:users,id'],
            'priority' => ['sometimes', 'required', Rule::in(Task::PRIORITIES)],
            'start_date' => ['nullable', 'date'],
            'deadline' => ['sometimes', 'required', 'date'],
            'progress_pct' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'is_blocked' => ['sometimes', 'boolean'],
            'blocker_note' => ['nullable', 'string', 'max:2000'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}

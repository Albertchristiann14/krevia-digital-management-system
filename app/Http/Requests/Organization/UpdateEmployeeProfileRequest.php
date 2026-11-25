<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('organization.manage')
            || $this->user()?->can('organization.edit')
            || false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'weekly_capacity_hours' => ['nullable', 'numeric', 'min:0', 'max:80'],
            'capacity_status' => ['required', Rule::in(['Disepakati', 'Usulan', 'Perlu Konfirmasi Manajemen'])],
            'coordination_status' => ['required', Rule::in(['Sesuai arahan', 'Disepakati', 'Usulan (D-06)', 'Usulan', 'Perlu Konfirmasi Manajemen'])],
            'coordination_note' => ['nullable', 'string', 'max:500'],
            'focus_summary' => ['nullable', 'string', 'max:500'],
            'employment_status' => ['required', Rule::in(['Active', 'Part-Time', 'Inactive'])],
            'primary_supervisor_id' => ['nullable', 'exists:users,id'],
            'secondary_supervisor_id' => ['nullable', 'exists:users,id'],
        ];
    }
}

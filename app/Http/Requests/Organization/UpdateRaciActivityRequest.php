<?php

namespace App\Http\Requests\Organization;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRaciActivityRequest extends FormRequest
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
            'notes' => ['nullable', 'string', 'max:500'],
            'data_status' => ['required', Rule::in(['Disepakati', 'Usulan', 'Perlu Konfirmasi Manajemen'])],
            'assignments' => ['required', 'array'],
            'assignments.*' => ['nullable', Rule::in(['', 'A', 'R', 'A/R', 'C', 'I'])],
        ];
    }
}

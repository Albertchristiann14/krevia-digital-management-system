<?php

namespace App\Domain\Organization\Services;

use Illuminate\Validation\ValidationException;

class RaciValidatorService
{
    public const VALID_CODES = ['A', 'R', 'A/R', 'C', 'I'];

    /**
     * Enforces Sheet 04 RACI invariant:
     * Every activity must have exactly ONE Accountable (A or A/R)
     * and at least ONE Responsible (R or A/R).
     *
     * @param  array<int, string|null>  $assignmentsByUserId
     */
    public function validateOrFail(array $assignmentsByUserId): void
    {
        $accountableCount = 0;
        $responsibleCount = 0;

        foreach ($assignmentsByUserId as $code) {
            if ($code === null || $code === '') {
                continue;
            }

            if (! in_array($code, self::VALID_CODES, true)) {
                throw ValidationException::withMessages([
                    'assignments' => "Invalid RACI code '{$code}'. Allowed: A, R, A/R, C, I.",
                ]);
            }

            if (str_contains($code, 'A')) {
                $accountableCount++;
            }
            if (str_contains($code, 'R')) {
                $responsibleCount++;
            }
        }

        if ($accountableCount !== 1) {
            throw ValidationException::withMessages([
                'assignments' => "Every RACI activity must have exactly one Accountable (A or A/R); found {$accountableCount}.",
            ]);
        }

        if ($responsibleCount < 1) {
            throw ValidationException::withMessages([
                'assignments' => 'Every RACI activity must have at least one Responsible (R or A/R).',
            ]);
        }
    }
}

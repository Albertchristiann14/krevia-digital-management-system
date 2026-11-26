<?php

namespace App\Domain\Workspace\Services;

use App\Domain\Workspace\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditLogger
{
    public function log(
        string $event,
        string $summary,
        ?Model $subject = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?int $actorId = null
    ): AuditLog {
        $key = $subject?->getKey();
        $isNumericKey = $key !== null && is_numeric($key);

        return AuditLog::create([
            'user_id' => $actorId ?? Auth::id(),
            'event' => $event,
            'auditable_type' => $subject ? $subject::class : null,
            'auditable_id' => $isNumericKey ? (int) $key : null,
            'auditable_uuid' => (! $isNumericKey && $key !== null) ? (string) $key : null,
            'summary' => $summary,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'created_at' => now(),
        ]);
    }
}

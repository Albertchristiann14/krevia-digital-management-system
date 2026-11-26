<?php

namespace App\Services\Identity;

use App\Domain\Workspace\Services\AuditLogger;
use App\Models\DigitalIdentity;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DigitalIdentityService
{
    public function isEligible(User $user): bool
    {
        return (bool) $user->is_active;
    }

    /**
     * Ensure an eligible user has an active or inactive (non-revoked) digital identity.
     * Automatically provisions one on first access without requiring manual generation.
     */
    public function ensureForUser(User $user): ?DigitalIdentity
    {
        if (! Schema::hasTable('digital_identities') || ! $this->isEligible($user)) {
            return null;
        }

        $current = DigitalIdentity::query()
            ->where('user_id', $user->id)
            ->whereIn('status', [DigitalIdentity::STATUS_ACTIVE, DigitalIdentity::STATUS_INACTIVE])
            ->latest('id')
            ->first();

        if ($current) {
            return $current;
        }

        return $this->issueToken($user, isRegeneration: false);
    }

    public function regenerateForUser(User $user, ?User $actor = null): DigitalIdentity
    {
        return $this->issueToken($user, isRegeneration: true, actor: $actor);
    }

    public function setActiveState(User $user, bool $active, ?User $actor = null): DigitalIdentity
    {
        $identity = $this->ensureForUser($user);
        if (! $identity) {
            abort(422, 'Member is not eligible for a Digital Identity.');
        }

        $nextStatus = $active ? DigitalIdentity::STATUS_ACTIVE : DigitalIdentity::STATUS_INACTIVE;

        if ($identity->status !== $nextStatus) {
            $identity->update(['status' => $nextStatus]);

            app(AuditLogger::class)->log(
                $active ? 'identity.qr_activated' : 'identity.qr_deactivated',
                $active ? 'Activated personal QR Digital Identity' : 'Deactivated personal QR Digital Identity',
                $identity,
                null,
                ['status' => $nextStatus],
                ($actor ?? $user)->id
            );
        }

        return $identity->fresh();
    }

    /**
     * Resolve a raw QR token by comparing its SHA-256 hash in the database.
     *
     * @return array{state: string, identity: ?DigitalIdentity, user: ?User}
     */
    public function resolveToken(string $rawToken): array
    {
        $trimmed = trim($rawToken);
        if ($trimmed === '' || strlen($trimmed) < 16 || ! Schema::hasTable('digital_identities')) {
            return ['state' => 'invalid', 'identity' => null, 'user' => null];
        }

        $hash = hash('sha256', $trimmed);

        $identity = DigitalIdentity::query()
            ->with(['user.employeeProfile.department', 'user.employeeProfile.position'])
            ->where('token_hash', $hash)
            ->first();

        if (! $identity || ! $identity->user) {
            return ['state' => 'invalid', 'identity' => null, 'user' => null];
        }

        if ($identity->status === DigitalIdentity::STATUS_REVOKED) {
            return ['state' => 'revoked', 'identity' => $identity, 'user' => null];
        }

        if (! $identity->user->is_active) {
            return ['state' => 'suspended', 'identity' => $identity, 'user' => null];
        }

        if ($identity->status === DigitalIdentity::STATUS_INACTIVE) {
            return ['state' => 'inactive', 'identity' => $identity, 'user' => null];
        }

        $identity->forceFill(['last_verified_at' => now()])->save();

        return [
            'state' => 'verified',
            'identity' => $identity,
            'user' => $identity->user,
        ];
    }

    private function issueToken(User $user, bool $isRegeneration, ?User $actor = null): DigitalIdentity
    {
        return DB::transaction(function () use ($user, $isRegeneration, $actor): DigitalIdentity {
            DigitalIdentity::query()
                ->where('user_id', $user->id)
                ->whereIn('status', [DigitalIdentity::STATUS_ACTIVE, DigitalIdentity::STATUS_INACTIVE])
                ->update([
                    'status' => DigitalIdentity::STATUS_REVOKED,
                    'revoked_at' => now(),
                ]);

            $rawToken = bin2hex(random_bytes(24));
            $tokenHash = hash('sha256', $rawToken);

            $identity = DigitalIdentity::create([
                'user_id' => $user->id,
                'token_hash' => $tokenHash,
                'token_encrypted' => $rawToken,
                'status' => DigitalIdentity::STATUS_ACTIVE,
                'regenerated_at' => $isRegeneration ? now() : null,
            ]);

            app(AuditLogger::class)->log(
                $isRegeneration ? 'identity.qr_regenerated' : 'identity.qr_generated',
                $isRegeneration
                    ? 'Regenerated personal QR Digital Identity token (previous token revoked)'
                    : 'Generated initial personal QR Digital Identity token',
                $identity,
                null,
                ['status' => DigitalIdentity::STATUS_ACTIVE],
                ($actor ?? $user)->id
            );

            return $identity;
        });
    }
}

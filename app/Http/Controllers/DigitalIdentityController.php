<?php

namespace App\Http\Controllers;

use App\Domain\Workspace\Services\AuditLogger;
use App\Models\User;
use App\Services\Identity\DigitalIdentityService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DigitalIdentityController extends Controller
{
    public function __construct(private readonly DigitalIdentityService $identityService)
    {
    }

    /**
     * Publicly accessible Digital Identity verification & business card landing page.
     * Never exposes private account details, employee ID (unless authorized viewer), or raw tokens.
     */
    public function showPublic(Request $request, string $token): Response
    {
        $resolved = $this->identityService->resolveToken($token);
        $state = $resolved['state'];
        $user = $resolved['user'];
        $identity = $resolved['identity'];

        $viewer = $request->user();
        $canViewEmployeeCode = $viewer !== null && ($viewer->can('users.manage') || $viewer->can('organization.manage'));

        $memberPayload = null;
        if ($state === 'verified' && $user !== null) {
            $profile = $user->employeeProfile;
            $visibility = $user->publicVisibility();

            $memberPayload = [
                'name' => $user->name,
                'avatar_url' => $user->avatarUrl(),
                'avatar_color' => $profile?->avatar_color ?? '#101D35',
                'position' => $profile?->position?->title ?? 'Team Member',
                'department' => $profile?->department?->name ?? 'Krevia Digital',
                'department_color' => $profile?->department?->color_hex ?? '#1E3A5F',
                'membership_status' => $user->is_active ? 'Active Member' : 'Inactive',
                'email' => $visibility['show_email'] ? $user->email : null,
                'whatsapp_number' => $visibility['show_whatsapp'] ? $profile?->whatsapp_number : null,
                'employee_code' => $canViewEmployeeCode ? $profile?->employee_code : null,
                'verified_at' => $identity?->last_verified_at?->toIso8601String(),
            ];
        }

        return Inertia::render('Identity/Show', [
            'verificationState' => $state,
            'member' => $memberPayload,
        ]);
    }

    public function regenerate(Request $request): RedirectResponse
    {
        $user = $request->user();
        if (! $this->identityService->isEligible($user)) {
            return back()->with('error', 'Your account is not eligible for a Digital Identity.');
        }

        $this->identityService->regenerateForUser($user, $user);

        return back()->with('success', 'Your QR Digital Identity has been regenerated and the previous token was revoked.');
    }

    public function toggleStatus(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'active' => ['required', 'boolean'],
        ]);

        $user = $request->user();
        $this->identityService->setActiveState($user, (bool) $validated['active'], $user);

        return back()->with(
            'success',
            $validated['active'] ? 'QR Digital Identity activated.' : 'QR Digital Identity deactivated.'
        );
    }

    public function updateVisibility(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'show_email' => ['required', 'boolean'],
            'show_whatsapp' => ['required', 'boolean'],
        ]);

        $user = $request->user();
        $old = $user->publicVisibility();

        $next = [
            'show_email' => (bool) $validated['show_email'],
            'show_whatsapp' => (bool) $validated['show_whatsapp'],
        ];

        $user->forceFill(['public_visibility' => $next])->save();

        app(AuditLogger::class)->log(
            'identity.visibility_updated',
            'Updated public Digital Identity contact visibility settings',
            $user,
            $old,
            $next,
            $user->id
        );

        return back()->with('success', 'Public contact visibility settings updated.');
    }

    public function regenerateForMember(Request $request, User $member): RedirectResponse
    {
        $actor = $request->user();
        if (! $actor->can('users.manage') && ! $actor->can('organization.manage') && $actor->id !== $member->id) {
            abort(403);
        }

        $this->identityService->regenerateForUser($member, $actor);

        return back()->with('success', "QR Digital Identity regenerated for {$member->name}.");
    }

    public function toggleStatusForMember(Request $request, User $member): RedirectResponse
    {
        $actor = $request->user();
        if (! $actor->can('users.manage') && ! $actor->can('organization.manage') && $actor->id !== $member->id) {
            abort(403);
        }

        $validated = $request->validate([
            'active' => ['required', 'boolean'],
        ]);

        $this->identityService->setActiveState($member, (bool) $validated['active'], $actor);

        return back()->with('success', "QR Digital Identity status updated for {$member->name}.");
    }
}

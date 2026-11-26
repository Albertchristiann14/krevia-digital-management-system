<?php

namespace App\Http\Controllers;

use App\Domain\Organization\Models\Department;
use App\Domain\Organization\Models\Position;
use App\Models\User;
use App\Services\Identity\DigitalIdentityService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PeopleController extends Controller
{
    public function __construct(private readonly DigitalIdentityService $identityService)
    {
    }

    public function index(Request $request): Response
    {
        $viewer = $request->user();
        $canManageDirectory = $viewer->can('users.manage') || $viewer->can('organization.manage');

        $search = trim((string) $request->query('search', ''));
        $departmentId = $request->query('department_id') ? (int) $request->query('department_id') : null;
        $positionId = $request->query('position_id') ? (int) $request->query('position_id') : null;
        $status = (string) $request->query('status', 'active');

        $query = User::query()
            ->select(['id', 'name', 'avatar_path', 'is_active', 'updated_at'])
            ->with([
                'employeeProfile:id,user_id,department_id,position_id,employee_code,employment_status,avatar_color,joined_at',
                'employeeProfile.department:id,name,color_hex',
                'employeeProfile.position:id,title,level',
            ]);

        if (! $canManageDirectory) {
            $query->where('is_active', true);
        } elseif ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        if ($search !== '') {
            $query->where(function ($sub) use ($search, $canManageDirectory): void {
                $sub->where('name', 'like', "%{$search}%");
                if ($canManageDirectory) {
                    $sub->orWhereHas('employeeProfile', function ($pq) use ($search): void {
                        $pq->where('employee_code', 'like', "%{$search}%");
                    });
                }
            });
        }

        if ($departmentId) {
            $query->whereHas('employeeProfile', fn ($pq) => $pq->where('department_id', $departmentId));
        }

        if ($positionId) {
            $query->whereHas('employeeProfile', fn ($pq) => $pq->where('position_id', $positionId));
        }

        $members = $query
            ->orderBy('name')
            ->paginate(12)
            ->withQueryString()
            ->through(fn (User $member): array => [
                'id' => $member->id,
                'name' => $member->name,
                'avatar_url' => $member->avatarUrl(),
                'avatar_color' => $member->employeeProfile?->avatar_color ?? '#101D35',
                'position' => $member->employeeProfile?->position?->title ?? 'Team Member',
                'department' => $member->employeeProfile?->department?->name ?? 'Krevia Digital',
                'department_color' => $member->employeeProfile?->department?->color_hex ?? '#1E3A5F',
                'membership_status' => $member->is_active ? 'Active' : 'Inactive',
                'is_active' => (bool) $member->is_active,
                'employee_code' => $canManageDirectory ? $member->employeeProfile?->employee_code : null,
            ]);

        return Inertia::render('People/Index', [
            'members' => $members,
            'filters' => [
                'search' => $search,
                'department_id' => $departmentId ? (string) $departmentId : '',
                'position_id' => $positionId ? (string) $positionId : '',
                'status' => $canManageDirectory ? $status : 'active',
            ],
            'departments' => Department::query()->select(['id', 'name'])->orderBy('name')->get(),
            'positions' => Position::query()->select(['id', 'title as name'])->orderBy('title')->get(),
            'canManageDirectory' => $canManageDirectory,
        ]);
    }

    public function show(Request $request, User $member): Response
    {
        $viewer = $request->user();
        $canManageDirectory = $viewer->can('users.manage') || $viewer->can('organization.manage');
        $isOwner = $viewer->id === $member->id;

        if (! $member->is_active && ! $canManageDirectory && ! $isOwner) {
            abort(404);
        }

        $member->load([
            'employeeProfile.department:id,name,color_hex',
            'employeeProfile.position:id,title,level',
        ]);

        $profile = $member->employeeProfile;
        $visibility = $member->publicVisibility();
        $identity = $this->identityService->ensureForUser($member);

        $showEmail = $isOwner || $canManageDirectory || $visibility['show_email'];
        $showWhatsapp = $isOwner || $canManageDirectory || $visibility['show_whatsapp'];
        $showEmployeeCode = $isOwner || $canManageDirectory;

        return Inertia::render('People/Show', [
            'member' => [
                'id' => $member->id,
                'name' => $member->name,
                'avatar_url' => $member->avatarUrl(),
                'avatar_color' => $profile?->avatar_color ?? '#101D35',
                'position' => $profile?->position?->title ?? 'Team Member',
                'position_level' => $profile?->position?->level,
                'department' => $profile?->department?->name ?? 'Krevia Digital',
                'department_color' => $profile?->department?->color_hex ?? '#1E3A5F',
                'membership_status' => $member->is_active ? 'Active' : 'Inactive',
                'employment_status' => $profile?->employment_status ?? 'Active',
                'joined_at' => $profile?->joined_at?->toDateString(),
                'employee_code' => $showEmployeeCode ? $profile?->employee_code : null,
                'email' => $showEmail ? $member->email : null,
                'whatsapp_number' => $showWhatsapp ? $profile?->whatsapp_number : null,
            ],
            'digitalIdentity' => $identity ? [
                'status' => $identity->status,
                'public_url' => $identity->status === 'active' ? $identity->publicUrl() : null,
                'regenerated_at' => $identity->regenerated_at?->toIso8601String(),
            ] : null,
            'permissions' => [
                'is_owner' => $isOwner,
                'can_manage_identity' => $isOwner || $canManageDirectory,
            ],
        ]);
    }
}

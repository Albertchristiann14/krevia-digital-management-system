<?php

namespace App\Http\Controllers;

use App\Domain\Organization\Models\Department;
use App\Domain\Organization\Models\EmployeeProfile;
use App\Domain\Organization\Models\RaciActivity;
use App\Domain\Organization\Models\RaciAssignment;
use App\Domain\Organization\Services\RaciValidatorService;
use App\Domain\Workspace\Services\AuditLogger;
use App\Http\Requests\Organization\UpdateEmployeeProfileRequest;
use App\Http\Requests\Organization\UpdateRaciActivityRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewDirectory', EmployeeProfile::class);

        $profiles = EmployeeProfile::query()
            ->with([
                'user:id,name,email,is_active,last_login_at',
                'user.roles:id,name',
                'department:id,code,name,color_hex,lead_user_id',
                'position.jobDescription',
                'primarySupervisor:id,name',
                'secondarySupervisor:id,name',
            ])
            ->orderBy('employee_code')
            ->get();

        $departments = Department::query()
            ->with('lead:id,name')
            ->withCount('employeeProfiles')
            ->orderBy('sort_order')
            ->get();

        $raciActivities = RaciActivity::query()
            ->with('assignments:id,raci_activity_id,user_id,raci_code')
            ->orderBy('sort_order')
            ->get();

        $usersForRaci = $profiles->map(fn (EmployeeProfile $p) => [
            'id' => $p->user_id,
            'name' => $p->user?->name,
            'short_name' => explode(' ', (string) $p->user?->name)[0] === 'MHD' ? 'Yoga' : explode(' ', (string) $p->user?->name)[0],
            'employee_code' => $p->employee_code,
        ])->values();

        return Inertia::render('Organization/Index', [
            'initialTab' => $request->string('tab', 'directory')->toString(),
            'profiles' => $profiles->map(fn (EmployeeProfile $p) => [
                'id' => $p->id,
                'user_id' => $p->user_id,
                'employee_code' => $p->employee_code,
                'name' => $p->user?->name,
                'email' => $p->user?->email,
                'is_active' => (bool) $p->user?->is_active,
                'role' => $p->user?->roles->first()?->name,
                'department_id' => $p->department_id,
                'department' => $p->department?->name,
                'department_code' => $p->department?->code,
                'department_color' => $p->department?->color_hex,
                'position_id' => $p->position_id,
                'position' => $p->position?->title,
                'level' => $p->position?->level,
                'authority_summary' => $p->position?->authority_summary,
                'primary_supervisor_id' => $p->primary_supervisor_id,
                'primary_supervisor' => $p->primarySupervisor?->name,
                'secondary_supervisor_id' => $p->secondary_supervisor_id,
                'secondary_supervisor' => $p->secondarySupervisor?->name,
                'coordination_note' => $p->coordination_note,
                'coordination_status' => $p->coordination_status,
                'focus_summary' => $p->focus_summary,
                'weekly_capacity_hours' => $p->weekly_capacity_hours !== null ? (float) $p->weekly_capacity_hours : null,
                'capacity_status' => $p->capacity_status,
                'employment_status' => $p->employment_status,
                'joined_at' => $p->joined_at?->format('Y-m-d'),
                'avatar_url' => $p->user?->avatarUrl(),
                'avatar_color' => $p->avatar_color,
                'job_description' => $p->position?->jobDescription ? [
                    'purpose' => $p->position->jobDescription->purpose,
                    'responsibilities' => $p->position->jobDescription->responsibilities,
                    'routine_tasks' => $p->position->jobDescription->routine_tasks,
                    'project_tasks' => $p->position->jobDescription->project_tasks,
                    'expected_outputs' => $p->position->jobDescription->expected_outputs,
                    'success_indicators' => $p->position->jobDescription->success_indicators,
                    'authority_limits' => $p->position->jobDescription->authority_limits,
                    'coordination_links' => $p->position->jobDescription->coordination_links,
                ] : null,
            ]),
            'departments' => $departments->map(fn (Department $d) => [
                'id' => $d->id,
                'code' => $d->code,
                'name' => $d->name,
                'color_hex' => $d->color_hex,
                'description' => $d->description,
                'lead' => $d->lead?->name,
                'members_count' => $d->employee_profiles_count,
            ]),
            'raciUsers' => $usersForRaci,
            'raciActivities' => $raciActivities->map(fn (RaciActivity $a) => [
                'id' => $a->id,
                'sort_order' => $a->sort_order,
                'activity_name' => $a->activity_name,
                'notes' => $a->notes,
                'data_status' => $a->data_status,
                'assignments' => $a->assignments->mapWithKeys(fn ($as) => [$as->user_id => $as->raci_code]),
            ]),
            'canEdit' => $request->user()?->can('organization.manage') || $request->user()?->can('organization.edit'),
        ]);
    }

    public function updateProfile(
        UpdateEmployeeProfileRequest $request,
        EmployeeProfile $employeeProfile,
        AuditLogger $audit
    ): RedirectResponse {
        $this->authorize('updateProfile', $employeeProfile);

        $oldValues = $employeeProfile->only([
            'weekly_capacity_hours',
            'capacity_status',
            'coordination_status',
            'coordination_note',
            'employment_status',
            'focus_summary',
            'primary_supervisor_id',
            'secondary_supervisor_id',
        ]);

        $employeeProfile->update($request->validated());

        $audit->log(
            'organization.profile_updated',
            "Updated profile for {$employeeProfile->user->name} ({$employeeProfile->employee_code}).",
            $employeeProfile,
            $oldValues,
            $employeeProfile->only(array_keys($oldValues))
        );

        return back()->with('success', "Profile for {$employeeProfile->user->name} updated.");
    }

    public function updateDepartment(Request $request, Department $department, AuditLogger $audit): RedirectResponse
    {
        $this->authorize('manageStructure', EmployeeProfile::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'color_hex' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $old = $department->only(['name', 'color_hex', 'description']);
        $department->update($data);

        $audit->log('organization.department_updated', "Updated department {$department->name}.", $department, $old, $data);

        return back()->with('success', "Department {$department->name} updated.");
    }

    public function updateRaci(
        UpdateRaciActivityRequest $request,
        RaciActivity $raciActivity,
        RaciValidatorService $validator,
        AuditLogger $audit
    ): RedirectResponse {
        $this->authorize('editRaci', EmployeeProfile::class);

        $assignments = $request->validated('assignments');
        $validator->validateOrFail($assignments);

        DB::transaction(function () use ($request, $raciActivity, $assignments, $audit): void {
            $oldAssignments = $raciActivity->assignments()->pluck('raci_code', 'user_id')->all();

            $raciActivity->update([
                'notes' => $request->validated('notes'),
                'data_status' => $request->validated('data_status'),
            ]);

            foreach ($assignments as $userId => $code) {
                if ($code === null || $code === '') {
                    RaciAssignment::where('raci_activity_id', $raciActivity->id)
                        ->where('user_id', (int) $userId)
                        ->delete();
                } else {
                    RaciAssignment::updateOrCreate(
                        ['raci_activity_id' => $raciActivity->id, 'user_id' => (int) $userId],
                        ['raci_code' => $code]
                    );
                }
            }

            $audit->log(
                'organization.raci_updated',
                "Updated RACI matrix for '{$raciActivity->activity_name}'.",
                $raciActivity,
                ['assignments' => $oldAssignments],
                ['assignments' => $assignments, 'data_status' => $request->validated('data_status')]
            );
        });

        return back()->with('success', "RACI updated for {$raciActivity->activity_name}.");
    }
}

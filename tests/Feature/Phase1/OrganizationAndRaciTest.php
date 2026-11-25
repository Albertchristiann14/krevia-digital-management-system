<?php

namespace Tests\Feature\Phase1;

use App\Domain\Organization\Models\Department;
use App\Domain\Organization\Models\EmployeeProfile;
use App\Domain\Organization\Models\JobDescription;
use App\Domain\Organization\Models\RaciActivity;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OrganizationAndRaciTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_workbook_baseline_organization_is_seeded_accurately(): void
    {
        $this->assertEquals(7, User::count());
        $this->assertEquals(7, EmployeeProfile::count());
        $this->assertEquals(5, Department::count());
        $this->assertEquals(7, JobDescription::count());
        $this->assertEquals(17, RaciActivity::count());
    }

    public function test_dashboard_and_organization_pages_load_without_n_plus_one_errors(): void
    {
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();

        $this->actingAs($farizy)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard/Index')
                ->where('metrics.team_members', 7)
                ->where('metrics.raci_activities', 17)
                ->has('team', 7)
            );

        $this->actingAs($farizy)
            ->get('/organization')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Organization/Index')
                ->has('profiles', 7)
                ->has('departments', 5)
                ->has('raciActivities', 17)
            );
    }

    public function test_farizy_can_update_employee_weekly_capacity_and_it_is_audited(): void
    {
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $anantaProfile = EmployeeProfile::where('employee_code', 'KRV-06')->firstOrFail();

        $response = $this->actingAs($farizy)->patch("/organization/profiles/{$anantaProfile->id}", [
            'weekly_capacity_hours' => 24,
            'capacity_status' => 'Disepakati',
            'coordination_status' => 'Sesuai arahan',
            'coordination_note' => $anantaProfile->coordination_note,
            'focus_summary' => $anantaProfile->focus_summary,
            'employment_status' => 'Part-Time',
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('employee_profiles', [
            'id' => $anantaProfile->id,
            'weekly_capacity_hours' => 24.00,
            'capacity_status' => 'Disepakati',
            'employment_status' => 'Part-Time',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'organization.profile_updated',
            'auditable_id' => $anantaProfile->id,
        ]);
    }

    public function test_contributor_cannot_modify_employee_profiles_or_raci(): void
    {
        $ananta = User::where('email', 'ananta@kreviadigital.com')->firstOrFail();
        $profile = EmployeeProfile::where('employee_code', 'KRV-06')->firstOrFail();
        $activity = RaciActivity::firstOrFail();

        $this->actingAs($ananta)
            ->patch("/organization/profiles/{$profile->id}", [
                'weekly_capacity_hours' => 40,
                'capacity_status' => 'Disepakati',
                'coordination_status' => 'Sesuai arahan',
                'employment_status' => 'Active',
            ])
            ->assertForbidden();

        $this->actingAs($ananta)
            ->put("/organization/raci/{$activity->id}", [
                'data_status' => 'Disepakati',
                'assignments' => [$ananta->id => 'A/R'],
            ])
            ->assertForbidden();
    }

    public function test_raci_validator_enforces_exact_one_accountable_and_at_least_one_responsible(): void
    {
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $activity = RaciActivity::firstOrFail();

        // Reject 2 Accountables
        $this->actingAs($farizy)
            ->put("/organization/raci/{$activity->id}", [
                'data_status' => 'Disepakati',
                'assignments' => [
                    $albert->id => 'A',
                    $farizy->id => 'A/R',
                ],
            ])
            ->assertSessionHasErrors('assignments');

        // Reject 0 Responsible
        $this->actingAs($farizy)
            ->put("/organization/raci/{$activity->id}", [
                'data_status' => 'Disepakati',
                'assignments' => [
                    $albert->id => 'A',
                    $farizy->id => 'C',
                ],
            ])
            ->assertSessionHasErrors('assignments');

        // Accept valid 1 A and 1 R
        $this->actingAs($farizy)
            ->put("/organization/raci/{$activity->id}", [
                'notes' => 'Validated in test',
                'data_status' => 'Disepakati',
                'assignments' => [
                    $albert->id => 'A',
                    $farizy->id => 'R',
                ],
            ])
            ->assertSessionHasNoErrors();
    }
}

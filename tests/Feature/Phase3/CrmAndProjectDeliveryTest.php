<?php

namespace Tests\Feature\Phase3;

use App\Domain\Crm\Models\Company;
use App\Domain\Crm\Models\FollowUp;
use App\Domain\Crm\Models\Lead;
use App\Domain\Crm\Models\PipelineHistory;
use App\Domain\Crm\Services\CrmWorkbookImporter;
use App\Domain\Project\Models\Project;
use App\Models\User;
use App\Notifications\CrmFollowUpNotification;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CrmAndProjectDeliveryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_crm_workbook_imports_55_prospects_idempotently(): void
    {
        $this->assertEquals(55, Lead::count());
        $this->assertEquals(55, Company::count());
        $this->assertEquals(29, Lead::where('stage', 'Lead Identified')->count());
        $this->assertEquals(25, Lead::where('stage', 'Initial Contact')->count());
        $this->assertEquals(1, Lead::where('stage', 'Lost')->count());

        $firstLead = Lead::orderBy('external_no')->firstOrFail();
        $firstLead->update(['stage' => 'Responded']);

        $summary = app(CrmWorkbookImporter::class)->import(
            storage_path('app/private/seed/workplan_2026_2027.xlsx'),
            preserveExisting: true
        );

        $this->assertEquals(55, $summary['leads_skipped']);
        $this->assertEquals('Responded', $firstLead->fresh()->stage);
    }

    public function test_pipeline_stage_transitions_enforce_rules_and_record_history(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $lead = Lead::where('stage', 'Lead Identified')->firstOrFail();

        // Moving to Lost without a reason must fail
        $this->actingAs($albert)
            ->post("/crm/leads/{$lead->id}/stage", [
                'stage' => 'Lost',
            ])
            ->assertSessionHasErrors('lost_reason');

        // Moving to Follow-up Later without next_follow_up_at must fail
        $this->actingAs($albert)
            ->post("/crm/leads/{$lead->id}/stage", [
                'stage' => 'Follow-up Later',
            ])
            ->assertSessionHasErrors('next_follow_up_at');

        // Moving to Discovery Meeting succeeds and logs immutable history
        $this->actingAs($albert)
            ->post("/crm/leads/{$lead->id}/stage", [
                'stage' => 'Discovery Meeting',
                'evidence_note' => 'Scheduled kickoff discovery call with founder.',
                'event_date' => '2026-12-10',
            ])
            ->assertRedirect();

        $lead->refresh();
        $this->assertEquals('Discovery Meeting', $lead->stage);
        $this->assertEquals('2026-12-10', $lead->discovery_meeting_at?->format('Y-m-d'));
        $this->assertTrue(
            PipelineHistory::where('lead_id', $lead->id)
                ->where('from_stage', 'Lead Identified')
                ->where('to_stage', 'Discovery Meeting')
                ->exists()
        );
    }

    public function test_won_lead_converts_to_project_without_duplicating_company_and_supports_both_workflows(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $lead = Lead::where('stage', 'Initial Contact')->firstOrFail();
        $initialCompanies = Company::count();

        // Cannot convert before Won
        $this->actingAs($albert)
            ->post("/crm/leads/{$lead->id}/convert", [
                'service_line' => Project::SERVICE_WEBSITE,
            ])
            ->assertSessionHasErrors('stage');

        // Move to Won, then convert to Website Development & CMS (12 stages)
        $this->actingAs($albert)->post("/crm/leads/{$lead->id}/stage", [
            'stage' => 'Won',
            'evidence_note' => 'Signed agreement confirmed.',
        ]);

        $this->actingAs($albert)
            ->post("/crm/leads/{$lead->id}/convert", [
                'name' => 'Website Portal Delivery',
                'service_line' => Project::SERVICE_WEBSITE,
                'start_date' => '2026-12-15',
            ])
            ->assertRedirect();

        $this->assertEquals($initialCompanies, Company::count());

        $webProject = Project::where('lead_id', $lead->id)->firstOrFail();
        $this->assertEquals($lead->company_id, $webProject->company_id);
        $this->assertEquals($lead->primary_contact_id, $webProject->primary_contact_id);
        $this->assertEquals(12, $webProject->stages()->count());
        $this->assertEquals('In Progress', $webProject->stages()->where('stage_order', 1)->firstOrFail()->status);

        // Create Custom Software Development project directly (13 stages)
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $aldo = User::where('email', 'aldo@kreviadigital.com')->firstOrFail();

        $this->actingAs($farizy)
            ->post('/projects', [
                'company_id' => $lead->company_id,
                'name' => 'Custom ERP Suite',
                'service_line' => Project::SERVICE_CUSTOM,
                'manager_user_id' => $farizy->id,
                'tech_lead_user_id' => $aldo->id,
            ])
            ->assertRedirect();

        $customProject = Project::where('name', 'Custom ERP Suite')->firstOrFail();
        $this->assertEquals(13, $customProject->stages()->count());
    }

    public function test_project_stage_gates_enforce_sequential_requirements_qa_uat_release_and_handover(): void
    {
        $aldo = User::where('email', 'aldo@kreviadigital.com')->firstOrFail();
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $company = Company::firstOrFail();

        $this->actingAs($farizy)->post('/projects', [
            'company_id' => $company->id,
            'name' => 'Gated Web Build',
            'service_line' => Project::SERVICE_WEBSITE,
            'manager_user_id' => $farizy->id,
            'tech_lead_user_id' => $aldo->id,
        ]);

        $project = Project::where('name', 'Gated Web Build')->firstOrFail();
        $stages = $project->stages()->orderBy('stage_order')->get()->keyBy('stage_order');

        // 1. Sequential gate: Stage 2 cannot complete before Stage 1
        $this->actingAs($aldo)
            ->post("/projects/{$project->id}/stages/{$stages[2]->id}/complete", [
                'completion_evidence_note' => 'Trying to skip stage 1',
            ])
            ->assertSessionHasErrors('stage');

        // Complete Stage 1
        $this->actingAs($aldo)
            ->post("/projects/{$project->id}/stages/{$stages[1]->id}/complete", [
                'completion_evidence_note' => 'Initial consultation notes recorded.',
            ])
            ->assertRedirect();

        // 2. Requirement Gathering gate: requires Client Approved requirement
        $this->actingAs($aldo)
            ->post("/projects/{$project->id}/stages/{$stages[2]->id}/complete", [
                'completion_evidence_note' => 'Attempting completion without approved requirement',
            ])
            ->assertSessionHasErrors('stage');

        $this->actingAs($aldo)->post("/projects/{$project->id}/requirements", [
            'title' => 'CMS Page Builder',
            'priority' => 'Tinggi',
            'status' => 'Client Approved',
            'approved_by_client_name' => 'Budi Santoso',
        ]);

        $this->actingAs($aldo)
            ->post("/projects/{$project->id}/stages/{$stages[2]->id}/complete", [
                'completion_evidence_note' => 'Client signed off REQ-01.',
            ])
            ->assertRedirect();

        // Advance stages 3..7
        foreach ([3, 4, 5, 6, 7] as $order) {
            $this->actingAs($aldo)
                ->post("/projects/{$project->id}/stages/{$stages[$order]->id}/complete", [
                    'completion_evidence_note' => "Verified output for stage {$order}",
                ])
                ->assertRedirect();
        }

        // 3. Testing & QA gate (Stage 8): cannot pass QA report with critical bugs > 0
        $this->actingAs($aldo)
            ->post("/projects/{$project->id}/qa-reports", [
                'title' => 'Staging QA Run 1',
                'environment' => 'staging',
                'critical_bugs' => 1,
                'high_bugs' => 0,
                'medium_bugs' => 2,
                'status' => 'Passed',
            ])
            ->assertSessionHasErrors('status');

        $this->actingAs($aldo)
            ->post("/projects/{$project->id}/stages/{$stages[8]->id}/complete", [
                'completion_evidence_note' => 'No passing QA yet',
            ])
            ->assertSessionHasErrors('stage');

        $this->actingAs($aldo)->post("/projects/{$project->id}/qa-reports", [
            'title' => 'Staging QA Run 2',
            'environment' => 'staging',
            'critical_bugs' => 0,
            'high_bugs' => 0,
            'medium_bugs' => 0,
            'status' => 'Passed',
        ]);

        $this->actingAs($aldo)
            ->post("/projects/{$project->id}/stages/{$stages[8]->id}/complete", [
                'completion_evidence_note' => 'QA passed with 0 critical/high bugs.',
            ])
            ->assertRedirect();

        // 4. UAT gate (Stage 9)
        $this->actingAs($aldo)
            ->post("/projects/{$project->id}/stages/{$stages[9]->id}/complete", [
                'completion_evidence_note' => 'Missing UAT record',
            ])
            ->assertSessionHasErrors('stage');

        $this->actingAs($aldo)->post("/projects/{$project->id}/uat-records", [
            'title' => 'Client Final UAT',
            'tester_name' => 'Budi Santoso',
            'status' => 'Approved',
        ]);

        $this->actingAs($aldo)
            ->post("/projects/{$project->id}/stages/{$stages[9]->id}/complete", [
                'completion_evidence_note' => 'Client UAT approved.',
            ])
            ->assertRedirect();

        // 5. Deployment gate (Stage 10): requires Live production release with backup + rollback
        $this->actingAs($aldo)
            ->post("/projects/{$project->id}/stages/{$stages[10]->id}/complete", [
                'completion_evidence_note' => 'Missing safe release',
            ])
            ->assertSessionHasErrors('stage');

        $this->actingAs($aldo)->post("/projects/{$project->id}/releases", [
            'version' => 'v1.0.0',
            'environment' => 'production',
            'has_backup' => true,
            'has_rollback_plan' => true,
            'status' => 'Live',
        ]);

        $this->actingAs($aldo)
            ->post("/projects/{$project->id}/stages/{$stages[10]->id}/complete", [
                'completion_evidence_note' => 'Production release v1.0.0 live with backup & rollback.',
            ])
            ->assertRedirect();

        // 6. Handover gate (Stage 11): requires Handover record
        $this->actingAs($aldo)
            ->post("/projects/{$project->id}/stages/{$stages[11]->id}/complete", [
                'completion_evidence_note' => 'Missing BAST',
            ])
            ->assertSessionHasErrors('stage');

        $this->actingAs($aldo)->post("/projects/{$project->id}/handover", [
            'handover_date' => '2026-12-28',
            'signed_by_client' => 'Budi Santoso',
            'access_transferred' => true,
            'guide_delivered' => true,
        ]);

        $this->actingAs($aldo)
            ->post("/projects/{$project->id}/stages/{$stages[11]->id}/complete", [
                'completion_evidence_note' => 'BAST signed and access handed over.',
            ])
            ->assertRedirect();

        $this->assertEquals('Maintenance', $project->fresh()->status);
    }

    public function test_followup_command_dispatches_notifications_and_rbac_restricts_writes(): void
    {
        Notification::fake();

        $ananta = User::where('email', 'ananta@kreviadigital.com')->firstOrFail();
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $lead = Lead::firstOrFail();

        // Technical contributor cannot create leads or projects directly
        $this->actingAs($ananta)
            ->post('/crm/leads', [
                'company_name' => 'Unauthorized Co',
                'industry' => 'Other',
                'service_line' => 'Website Development & CMS',
                'pic_user_id' => $albert->id,
            ])
            ->assertForbidden();

        $this->actingAs($ananta)
            ->post('/projects', [
                'company_id' => $lead->company_id,
                'name' => 'Unauthorized Project',
                'service_line' => Project::SERVICE_WEBSITE,
                'manager_user_id' => $albert->id,
                'tech_lead_user_id' => $albert->id,
            ])
            ->assertForbidden();

        // Create an overdue follow-up and run scheduler command
        FollowUp::create([
            'lead_id' => $lead->id,
            'assigned_to' => $albert->id,
            'due_at' => now()->subDay()->toDateString(),
            'note' => 'Call back client',
            'status' => 'Pending',
        ]);

        $this->artisan('kdms:check-crm-followups')->assertExitCode(0);

        Notification::assertSentTo($albert, CrmFollowUpNotification::class);
    }

    public function test_phase3_inertia_pages_render_without_lazy_loading_errors(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $aldo = User::where('email', 'aldo@kreviadigital.com')->firstOrFail();
        $lead = Lead::firstOrFail();

        $this->actingAs($farizy)->post('/projects', [
            'company_id' => $lead->company_id,
            'name' => 'Inertia Render Check Project',
            'service_line' => Project::SERVICE_WEBSITE,
            'manager_user_id' => $farizy->id,
            'tech_lead_user_id' => $aldo->id,
        ]);
        $project = Project::where('name', 'Inertia Render Check Project')->firstOrFail();

        $this->actingAs($albert)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard/Index')
                ->where('metrics.total_prospects', 55)
                ->where('metrics.active_projects', 1)
            );

        $this->actingAs($albert)
            ->get('/crm/leads')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Crm/Index')
                ->has('leads', 55)
            );

        $this->actingAs($albert)
            ->get("/crm/leads/{$lead->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Crm/Show'));

        $this->actingAs($albert)
            ->get('/crm/companies')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Crm/Companies')
                ->has('companies', 55)
            );

        $this->actingAs($albert)
            ->get('/projects')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Projects/Index')
                ->has('projects', 1)
            );

        $this->actingAs($albert)
            ->get("/projects/{$project->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Projects/Show')
                ->has('project.stages', 12)
            );
    }
}

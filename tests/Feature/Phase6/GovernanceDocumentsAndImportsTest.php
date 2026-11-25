<?php

namespace Tests\Feature\Phase6;

use App\Domain\Governance\Models\Decision;
use App\Domain\Governance\Models\Meeting;
use App\Domain\Governance\Models\MeetingForum;
use App\Domain\Governance\Models\QuarterlyReview;
use App\Domain\Governance\Models\Risk;
use App\Domain\Governance\Services\GovernanceWorkbookImporter;
use App\Domain\Workspace\Models\Document;
use App\Domain\Workspace\Models\ImportBatch;
use App\Models\User;
use App\Notifications\MeetingSlaNotification;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GovernanceDocumentsAndImportsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_sheet14_and_sheet15_import_risks_decisions_forums_meetings_and_quarterly_reviews_idempotently(): void
    {
        $this->assertEquals(17, Risk::count());
        $this->assertEquals(13, Decision::count());
        $this->assertEquals(6, MeetingForum::count());
        $this->assertEquals(16, Meeting::count());
        $this->assertEquals(5, QuarterlyReview::count());

        $r02 = Risk::where('code', 'R-02')->firstOrFail();
        $this->assertEquals(16, $r02->score);
        $this->assertEquals('Tinggi', $r02->level);
        $this->assertNotEmpty($r02->contingency_plan);

        $d06 = Decision::where('code', 'D-06')->firstOrFail();
        $this->assertEquals('Perlu Konfirmasi Manajemen', $d06->data_status);
        $this->assertEquals('Open', $d06->status);

        $r01 = Risk::where('code', 'R-01')->firstOrFail();
        $r01->update(['status' => 'Monitoring']);

        $summary = app(GovernanceWorkbookImporter::class)->import(
            storage_path('app/private/seed/workplan_2026_2027.xlsx'),
            preserveExisting: true
        );

        $this->assertEquals(17, $summary['risks_skipped']);
        $this->assertEquals(13, $summary['decisions_skipped']);
        $this->assertEquals('Monitoring', $r01->fresh()->status);
    }

    public function test_high_risk_contingency_rule_and_decision_approval_flow(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $ananta = User::where('email', 'ananta@kreviadigital.com')->firstOrFail();

        // Ananta lacks risks.manage -> 403
        $this->actingAs($ananta)
            ->post('/governance/risks', [
                'category' => 'Teknis',
                'title' => 'Unauthorized Risk',
                'likelihood' => 2,
                'impact' => 2,
                'pic_user_id' => $albert->id,
                'mitigation_plan' => 'None',
            ])
            ->assertForbidden();

        // High risk (4 * 4 = 16 >= 15) without contingency_plan must fail
        $this->actingAs($farizy)
            ->post('/governance/risks', [
                'category' => 'Teknis',
                'title' => 'Critical Infrastructure Outage',
                'likelihood' => 4,
                'impact' => 4,
                'pic_user_id' => $albert->id,
                'mitigation_plan' => 'Automated daily backups.',
                'contingency_plan' => '',
            ])
            ->assertSessionHasErrors('contingency_plan');

        // With contingency plan it succeeds and sets score = 16, level = Tinggi
        $this->actingAs($farizy)
            ->post('/governance/risks', [
                'category' => 'Teknis',
                'title' => 'Critical Infrastructure Outage',
                'likelihood' => 4,
                'impact' => 4,
                'pic_user_id' => $albert->id,
                'mitigation_plan' => 'Automated daily backups.',
                'contingency_plan' => 'Failover to standby cloud region within 2 hours.',
            ])
            ->assertRedirect();

        $risk = Risk::where('title', 'Critical Infrastructure Outage')->firstOrFail();
        $this->assertEquals(16, $risk->score);
        $this->assertEquals('Tinggi', $risk->level);

        // Decision confirmation restricted to Albert (decisions.approve)
        $d06 = Decision::where('code', 'D-06')->firstOrFail();
        $this->actingAs($ananta)->post("/governance/decisions/{$d06->id}/approve")->assertForbidden();
        $this->actingAs($albert)->post("/governance/decisions/{$d06->id}/approve")->assertRedirect();
        $this->assertEquals('Done', $d06->fresh()->status);
        $this->assertEquals('Disepakati', $d06->fresh()->data_status);
    }

    public function test_meeting_h1_agenda_gate_minutes_decision_promotion_and_sla_command(): void
    {
        Notification::fake();

        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();

        // Create meeting without agenda
        $this->actingAs($farizy)->post('/governance/meetings', [
            'forum_name' => 'Weekly Team Sync',
            'focus' => 'Sprint Readiness Review',
            'scheduled_date' => now()->toDateString(),
            'pic_user_id' => $farizy->id,
        ])->assertRedirect();

        $meeting = Meeting::where('focus', 'Sprint Readiness Review')->firstOrFail();

        // SLA command notifies missing H-1 agenda
        $this->artisan('kdms:check-meeting-slas')->assertExitCode(0);
        Notification::assertSentTo($farizy, MeetingSlaNotification::class);

        // Cannot record minutes before publishing agenda
        $this->actingAs($farizy)
            ->post("/governance/meetings/{$meeting->id}/minutes", [
                'summary' => 'Attempted without agenda.',
            ])
            ->assertSessionHasErrors('agenda');

        // Publish agenda -> record minutes -> promote decision -> submit weekly report
        $this->actingAs($farizy)->post("/governance/meetings/{$meeting->id}/agenda", [
            'agenda' => '1. Review blockers 2. Confirm release checklist',
        ])->assertRedirect();

        $this->actingAs($farizy)->post("/governance/meetings/{$meeting->id}/minutes", [
            'summary' => 'All blockers cleared; release ready.',
            'decisions_summary' => 'Approved Friday staging freeze.',
        ])->assertRedirect();

        $meeting->refresh();
        $this->assertEquals('Completed', $meeting->status);
        $this->assertNotNull($meeting->minute);
        $this->assertTrue($meeting->minute->is_within_24h_sla);

        $this->actingAs($albert)->post("/governance/meetings/{$meeting->id}/promote-decision", [
            'topic_decision' => 'Approved Friday staging freeze before client UAT.',
            'pic_user_id' => $farizy->id,
        ])->assertRedirect();

        $this->assertTrue(
            Decision::where('source_meeting_id', $meeting->id)->exists()
        );

        $this->actingAs($farizy)->post('/governance/weekly-reports', [
            'week_start_date' => now()->toDateString(),
            'completed_tasks_summary' => 'Completed T-001 and T-002.',
            'in_progress_summary' => 'Working on T-003.',
            'next_week_plan' => 'Launch Phase 1 review.',
        ])->assertRedirect();
    }

    public function test_private_documents_full_import_dry_run_export_and_backup_command(): void
    {
        Storage::fake('local');

        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $ananta = User::where('email', 'ananta@kreviadigital.com')->firstOrFail();

        // Upload & authorized download in Document Center
        $this->actingAs($albert)->post('/documents', [
            'title' => 'Krevia Company Profile SOP',
            'category' => 'SOP & Governance',
            'version' => 'v1.0',
            'data_status' => 'Disepakati',
            'file' => UploadedFile::fake()->create('sop_krevia.pdf', 120, 'application/pdf'),
        ])->assertRedirect();

        $doc = Document::where('title', 'Krevia Company Profile SOP')->firstOrFail();
        Storage::disk('local')->assertExists($doc->file_path);

        $this->actingAs($ananta)->get("/documents/{$doc->id}/download")->assertOk();
        $this->actingAs($ananta)->delete("/documents/{$doc->id}")->assertForbidden();

        // Dry-run import via web UI (Ananta forbidden; Albert allowed)
        $this->actingAs($ananta)->get('/admin/imports')->assertForbidden();

        $this->actingAs($albert)
            ->post('/admin/imports/run', [
                'mode' => 'dry_run',
                'preserve_existing' => true,
            ])
            ->assertRedirect();

        $this->assertTrue(ImportBatch::where('mode', 'dry_run')->exists());

        // CLI dry-run & backup command
        $this->artisan('kdms:import-workplan', ['--dry-run' => true])->assertExitCode(0);

        $backupPath = storage_path('app/private/backups/test_backup.json');
        $this->artisan('kdms:backup-database', ['--path' => $backupPath])->assertExitCode(0);
        $this->assertFileExists($backupPath);
        @unlink($backupPath);

        // Live export .xlsx
        $this->actingAs($albert)->get('/admin/imports/export')->assertOk();

        // Inertia page checks
        $this->actingAs($albert)
            ->get('/governance/meetings')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Governance/Meetings')
                ->has('forums', 6)
                ->has('meetings', 16)
                ->has('quarterlyReviews', 5)
            );

        $this->actingAs($albert)
            ->get('/governance/risks-decisions')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Governance/RisksAndDecisions')
                ->has('risks', 17)
                ->has('decisions', 13)
            );

        $this->actingAs($albert)
            ->get('/documents')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Documents/Index'));

        $this->actingAs($albert)
            ->get('/admin/imports')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Admin/ImportExport'));
    }
}

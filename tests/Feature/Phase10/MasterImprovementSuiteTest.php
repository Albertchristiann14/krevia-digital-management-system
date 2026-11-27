<?php

namespace Tests\Feature\Phase10;

use App\Domain\Finance\Models\FinancialSetting;
use App\Domain\Finance\Models\Transaction;
use App\Domain\Workplan\Models\AnnualRoadmap;
use App\Domain\Workplan\Models\Task;
use App\Domain\Workspace\Models\Announcement;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MasterImprovementSuiteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_task_reviewer_assignment_edit_multi_file_evidence_and_completion_gate(): void
    {
        Storage::fake('local');
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $yoga = User::where('email', 'yoga@kreviadigital.com')->firstOrFail();

        $task = Task::query()->firstOrFail();
        $task->forceFill([
            'pic_user_id' => $yoga->id,
            'reviewer_user_id' => null,
            'status' => 'In Progress',
        ])->save();
        $task->evidences()->delete();

        // 1. Assign reviewer & edit task fields
        $this->actingAs($albert)
            ->patch("/tasks/{$task->id}", [
                'title' => 'Updated Master Task Title',
                'description' => 'Updated detailed description',
                'pic_user_id' => $yoga->id,
                'reviewer_user_id' => $farizy->id,
                'priority' => 'Tinggi',
                'deadline' => '2027-02-15',
            ])
            ->assertRedirect();

        $task->refresh();
        $this->assertSame('Updated Master Task Title', $task->title);
        $this->assertSame($farizy->id, $task->reviewer_user_id);

        // 2. Upload multiple completion evidence files & reject invalid php file
        $badFile = UploadedFile::fake()->create('exploit.php', 10, 'application/x-php');
        $this->actingAs($yoga)
            ->post("/tasks/{$task->id}/evidences", [
                'type' => 'file',
                'files' => [$badFile],
            ])
            ->assertSessionHasErrors('files.0');

        $pdf = UploadedFile::fake()->create('report.pdf', 120, 'application/pdf');
        $img = UploadedFile::fake()->image('screenshot.png', 400, 300);

        $this->actingAs($yoga)
            ->post("/tasks/{$task->id}/evidences", [
                'type' => 'file',
                'title' => 'Deliverable Pack',
                'files' => [$pdf, $img],
            ])
            ->assertRedirect();

        $task->refresh();
        $this->assertCount(2, $task->evidences);

        $firstEvidence = $task->evidences->first();
        $this->actingAs($farizy)
            ->get("/tasks/{$task->id}/evidences/{$firstEvidence->id}/preview")
            ->assertOk();

        // 3. Submit for review, request revision, re-submit, then approve
        $this->actingAs($yoga)
            ->post("/tasks/{$task->id}/transition", ['status' => 'Under Review'])
            ->assertRedirect();
        $this->assertSame('Under Review', $task->fresh()->status);

        $this->actingAs($farizy)
            ->post("/tasks/{$task->id}/transition", [
                'status' => 'In Progress',
                'note' => 'Please add summary slide',
            ])
            ->assertRedirect();
        $this->assertSame('In Progress', $task->fresh()->status);

        $this->actingAs($yoga)
            ->post("/tasks/{$task->id}/transition", ['status' => 'Under Review'])
            ->assertRedirect();

        $this->actingAs($farizy)
            ->post("/tasks/{$task->id}/transition", ['status' => 'Completed'])
            ->assertRedirect();

        $task->refresh();
        $this->assertSame('Completed', $task->status);
        $this->assertSame($farizy->id, $task->approved_by);
    }

    public function test_dashboard_pending_approvals_and_period_filters_are_accurate(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();

        FinancialSetting::query()->updateOrCreate([], [
            'opening_cash_balance' => 1000000,
        ]);

        Transaction::create([
            'code' => 'TX-PREV-01',
            'type' => Transaction::TYPE_INCOME,
            'category' => 'Client Payment',
            'description' => 'Previous month income',
            'amount' => 500000,
            'transaction_date' => now()->subMonthNoOverflow()->startOfMonth()->toDateString(),
            'period_month' => now()->subMonthNoOverflow()->format('Y-m'),
            'recorded_by' => $albert->id,
        ]);

        Transaction::create([
            'code' => 'TX-CURR-01',
            'type' => Transaction::TYPE_INCOME,
            'category' => 'Client Payment',
            'description' => 'Current month income',
            'amount' => 250000,
            'transaction_date' => now()->toDateString(),
            'period_month' => now()->format('Y-m'),
            'recorded_by' => $albert->id,
        ]);

        $underReviewCount = Task::where('status', 'Under Review')->count();

        // This month filter: revenue = 250,000, point-in-time cash balance >= 1,750,000
        $this->actingAs($albert)
            ->get('/dashboard?period=this_month')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('metrics.pending_task_approvals_count', $underReviewCount)
                ->where('periodFilter.period', 'this_month')
                ->where('metrics.revenue_received', fn ($val) => (float) $val === 250000.0)
                ->where('metrics.cash_balance', fn ($val) => (float) $val >= 1750000.0)
            );
    }

    public function test_global_search_returns_permission_scoped_results(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $task = Task::query()->firstOrFail();

        $this->actingAs($albert)
            ->getJson('/search?q='.urlencode($task->code))
            ->assertOk()
            ->assertJsonStructure(['groups' => [['module', 'items' => [['id', 'title', 'subtitle', 'url']]]]]);

        // Restricted user without tasks.view must not receive Tasks group
        $restrictedRole = Role::create(['name' => 'NoTasksRole', 'guard_name' => 'web']);
        $guest = User::factory()->create(['is_active' => true]);
        $guest->assignRole($restrictedRole);

        $response = $this->actingAs($guest)
            ->getJson('/search?q='.urlencode($task->code))
            ->assertOk();

        $modules = collect($response->json('groups'))->pluck('module')->all();
        $this->assertNotContains('Tasks', $modules);
    }

    public function test_roadmap_and_announcements_support_full_crud_and_safe_deletion(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();

        // Create empty roadmap month & delete it
        $this->actingAs($albert)
            ->post('/workplan/roadmap', [
                'period_month' => '2028-02-01',
                'month_label' => 'Feb 2028',
                'phase_label' => 'Expansion',
                'primary_focus' => 'Enterprise scaling',
                'target_contacts' => 20,
                'target_meetings' => 8,
                'target_proposals' => 4,
                'target_won' => 2,
                'target_status' => 'Usulan',
            ])
            ->assertRedirect();

        $createdRoadmap = AnnualRoadmap::where('month_label', 'Feb 2028')->firstOrFail();
        $this->actingAs($albert)
            ->delete("/workplan/roadmap/{$createdRoadmap->id}")
            ->assertRedirect();
        $this->assertDatabaseMissing('annual_roadmaps', ['id' => $createdRoadmap->id]);

        // Announcements edit & soft-delete + cleanup command
        $ann = Announcement::create([
            'code' => 'ANN-CRUD-01',
            'title' => 'Testing lagiii',
            'body' => 'Dummy body',
            'priority' => 'Normal',
            'audience_type' => 'all',
            'published_by' => $albert->id,
            'published_at' => now(),
        ]);

        $this->artisan('kdms:cleanup-test-announcements')->assertExitCode(0);
        $this->assertDatabaseMissing('announcements', ['id' => $ann->id]);

        $realAnn = Announcement::create([
            'code' => 'ANN-REAL-01',
            'title' => 'Quarterly Townhall',
            'body' => 'Legitimate notice',
            'priority' => 'Normal',
            'audience_type' => 'all',
            'published_by' => $albert->id,
            'published_at' => now(),
        ]);

        $this->actingAs($albert)
            ->patch("/announcements/{$realAnn->id}", [
                'title' => 'Quarterly Townhall Updated',
                'body' => 'Updated body',
                'priority' => 'Penting',
            ])
            ->assertRedirect();
        $this->assertSame('Quarterly Townhall Updated', $realAnn->fresh()->title);

        $this->actingAs($albert)
            ->delete("/announcements/{$realAnn->id}")
            ->assertRedirect();
        $this->assertSoftDeleted('announcements', ['id' => $realAnn->id]);
    }
}

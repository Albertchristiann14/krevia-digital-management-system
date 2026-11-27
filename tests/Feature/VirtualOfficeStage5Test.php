<?php

namespace Tests\Feature;

use App\Domain\Crm\Models\Company;
use App\Domain\Project\Models\Project;
use App\Domain\VirtualOffice\Events\OfficeVisitorUpdated;
use App\Domain\VirtualOffice\Models\OfficeVisitor;
use App\Domain\Workplan\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class VirtualOfficeStage5Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RbacSeeder::class);
        $this->seed(\Database\Seeders\VirtualOfficeSeeder::class);
    }

    public function test_visitor_checkin_admit_and_checkout_with_crm_link(): void
    {
        Event::fake([OfficeVisitorUpdated::class]);

        $receptionist = User::factory()->create(['is_active' => true]);
        $host = User::factory()->create(['is_active' => true]);
        $stranger = User::factory()->create(['is_active' => true]);

        $company = Company::create([
            'name' => 'PT Mitra Krevia',
            'industry' => 'Perusahaan Jasa',
        ]);

        $res = $this->actingAs($receptionist)->postJson('/virtual-office/visitors', [
            'name' => 'Budi Santoso',
            'company_id' => $company->id,
            'purpose' => 'Demo Website Project',
            'host_user_id' => $host->id,
        ]);

        $res->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('visitor.status', 'waiting')
            ->assertJsonPath('visitor.company_name', 'PT Mitra Krevia');

        Event::assertDispatched(OfficeVisitorUpdated::class);
        $visitorId = $res->json('visitor.id');

        // Unrelated non-host non-admin cannot admit
        $this->actingAs($stranger)->postJson("/virtual-office/visitors/{$visitorId}/respond", [
            'action' => 'admit',
        ])->assertStatus(403);

        // Host admits visitor, then checks out
        $this->actingAs($host)->postJson("/virtual-office/visitors/{$visitorId}/respond", [
            'action' => 'admit',
        ])->assertOk()->assertJsonPath('visitor.status', 'admitted');

        $this->actingAs($host)->postJson("/virtual-office/visitors/{$visitorId}/respond", [
            'action' => 'checkout',
        ])->assertOk()->assertJsonPath('visitor.status', 'checked_out');

        $this->assertDatabaseHas('office_visitors', [
            'id' => $visitorId,
            'status' => 'checked_out',
        ]);
    }

    public function test_project_kanban_returns_real_tasks_for_authorized_user(): void
    {
        $user = User::factory()->create(['is_active' => true]);
        $user->assignRole(User::ROLE_FOUNDER);

        $company = Company::create([
            'name' => 'PT Krevia Test',
            'industry' => 'Perusahaan Jasa',
        ]);

        $project = Project::create([
            'code' => 'PRJ-VO5',
            'company_id' => $company->id,
            'name' => 'Virtual Office Enhancement',
            'service_line' => Project::SERVICE_WEBSITE,
            'status' => 'Active',
            'manager_user_id' => $user->id,
            'tech_lead_user_id' => $user->id,
        ]);

        Task::create([
            'code' => 'T-901',
            'project_id' => $project->id,
            'title' => 'Build Kanban Board',
            'pic_user_id' => $user->id,
            'priority' => 'Tinggi',
            'start_date' => now()->toDateString(),
            'deadline' => now()->addDays(3)->toDateString(),
            'status' => 'In Progress',
            'progress_pct' => 50,
        ]);

        $res = $this->actingAs($user)->getJson("/virtual-office/project-kanban?project_id={$project->id}");
        $res->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('kanban.can_view', true)
            ->assertJsonPath('kanban.columns.in_progress.0.code', 'T-901');
    }

    public function test_coffee_invite_break_time_and_focus_mode(): void
    {
        $actor = User::factory()->create(['is_active' => true]);
        $target = User::factory()->create(['is_active' => true]);

        $this->actingAs($actor)->postJson("/virtual-office/coffee/{$target->id}", [
            'note' => 'Istirahat 10 menit yuk',
        ])->assertOk()->assertJsonPath('ok', true);

        $this->assertDatabaseHas('office_messages', [
            'scope' => 'dm',
            'sender_id' => $actor->id,
            'recipient_id' => $target->id,
        ]);

        $this->actingAs($actor)->postJson('/virtual-office/break-time')
            ->assertOk()
            ->assertJsonPath('myPresence.zone', 'lounge')
            ->assertJsonPath('myPresence.custom_status_text', 'Break Time (15m)');

        $this->actingAs($actor)->postJson('/virtual-office/focus-mode', ['enabled' => true])
            ->assertOk()
            ->assertJsonPath('myPresence.status_key', 'dnd')
            ->assertJsonPath('myPresence.custom_status_text', 'Focus Mode');

        $this->actingAs($actor)->postJson('/virtual-office/focus-mode', ['enabled' => false])
            ->assertOk()
            ->assertJsonPath('myPresence.status_key', 'available');
    }
}

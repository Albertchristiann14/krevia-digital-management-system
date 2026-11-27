<?php

namespace Tests\Feature;

use App\Domain\VirtualOffice\Events\OfficeTeamPulseUpdated;
use App\Domain\VirtualOffice\Models\OfficePresenceLog;
use App\Domain\VirtualOffice\Models\OfficeZone;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class VirtualOfficeStage6Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RbacSeeder::class);
        $this->seed(\Database\Seeders\VirtualOfficeSeeder::class);
    }

    public function test_daily_standup_start_and_submit_workflow(): void
    {
        Event::fake([OfficeTeamPulseUpdated::class]);

        $admin = User::factory()->create(['is_active' => true]);
        $admin->assignRole(User::ROLE_FOUNDER);
        $member = User::factory()->create(['is_active' => true]);

        // Non-admin cannot start team standup
        $this->actingAs($member)->postJson('/virtual-office/standups/start')
            ->assertStatus(403);

        // Admin starts standup
        $this->actingAs($admin)->postJson('/virtual-office/standups/start')
            ->assertOk()
            ->assertJsonPath('ok', true);

        Event::assertDispatched(OfficeTeamPulseUpdated::class);

        // Member submits standup
        $this->actingAs($member)->postJson('/virtual-office/standups', [
            'yesterday' => 'Completed Stage 5 modals',
            'today' => 'Testing Stage 6 standups',
            'blockers' => 'None',
        ])->assertOk()
            ->assertJsonPath('standup.user_id', $member->id)
            ->assertJsonPath('standup.today', 'Testing Stage 6 standups');

        $this->assertDatabaseHas('office_standups', [
            'user_id' => $member->id,
            'yesterday' => 'Completed Stage 5 modals',
        ]);
    }

    public function test_attendance_heatmap_and_zone_settings_require_admin(): void
    {
        $admin = User::factory()->create(['is_active' => true]);
        $admin->assignRole(User::ROLE_OPERATIONS);
        $member = User::factory()->create(['is_active' => true]);
        $zone = OfficeZone::query()->where('slug', 'workspace')->firstOrFail();

        OfficePresenceLog::create([
            'user_id' => $member->id,
            'zone_id' => $zone->id,
            'status' => 'online',
            'started_at' => now(),
        ]);

        // Non-admin blocked
        $this->actingAs($member)->getJson('/virtual-office/attendance-heatmap')->assertStatus(403);
        $this->actingAs($member)->patchJson("/virtual-office/zones/{$zone->id}", ['capacity' => 20])->assertStatus(403);

        // Admin succeeds
        $heatmap = $this->actingAs($admin)->getJson('/virtual-office/attendance-heatmap');
        $heatmap->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonCount(12, 'heatmap.hours');

        $this->actingAs($admin)->patchJson("/virtual-office/zones/{$zone->id}", [
            'capacity' => 15,
            'description' => 'Expanded engineering floor',
        ])->assertOk()->assertJsonPath('zone.capacity', 15);
    }

    public function test_summon_member_requires_admin_and_dispatches_event(): void
    {
        Event::fake([OfficeTeamPulseUpdated::class]);

        $admin = User::factory()->create(['is_active' => true]);
        $admin->assignRole(User::ROLE_FOUNDER);
        $member = User::factory()->create(['is_active' => true]);
        $zone = OfficeZone::query()->where('slug', 'meeting')->firstOrFail();

        $this->actingAs($member)->postJson('/virtual-office/summon', [
            'target_user_id' => $admin->id,
            'zone_id' => $zone->id,
        ])->assertStatus(403);

        $this->actingAs($admin)->postJson('/virtual-office/summon', [
            'target_user_id' => $member->id,
            'zone_id' => $zone->id,
            'note' => 'Sync cepat 5 menit',
        ])->assertOk()->assertJsonPath('summon.zone_slug', 'meeting');

        Event::assertDispatched(OfficeTeamPulseUpdated::class);
    }
}

<?php

namespace Tests\Feature;

use App\Domain\VirtualOffice\Models\OfficePresence;
use App\Domain\VirtualOffice\Models\OfficeZone;
use App\Domain\VirtualOffice\Services\PresenceService;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Database\Seeders\VirtualOfficeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class VirtualOfficeStage1Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->seed(VirtualOfficeSeeder::class);
        Event::fake();
    }

    public function test_unauthenticated_users_cannot_access_virtual_office_or_presence_endpoints(): void
    {
        $this->get('/virtual-office')->assertRedirect('/login');
        $this->postJson('/virtual-office/presence/heartbeat')->assertUnauthorized();
        $this->patchJson('/virtual-office/presence', ['status' => 'busy'])->assertUnauthorized();
        $this->getJson('/virtual-office/presence/snapshot')->assertUnauthorized();
    }

    public function test_presence_shows_actual_online_user_and_keeps_inactive_users_offline(): void
    {
        $userA = User::factory()->create(['is_active' => true]);
        $userB = User::factory()->create(['is_active' => true]);

        $this->actingAs($userA)->get('/virtual-office')->assertOk();

        $snapshot = $this->actingAs($userA)
            ->getJson('/virtual-office/presence/snapshot')
            ->assertOk()
            ->json('members');

        $byId = collect($snapshot)->keyBy('id');
        $this->assertSame('online', $byId[$userA->id]['status_key']);
        $this->assertSame('offline', $byId[$userB->id]['status_key']);
    }

    public function test_heartbeat_updates_activity_and_idle_transitions_to_away_and_stale_to_offline(): void
    {
        $user = User::factory()->create(['is_active' => true]);
        $service = app(PresenceService::class);

        $this->actingAs($user)
            ->postJson('/virtual-office/presence/heartbeat', ['has_activity' => true, 'zone_slug' => 'workspace'])
            ->assertOk()
            ->assertJsonPath('myPresence.status_key', 'online')
            ->assertJsonPath('myPresence.zone', 'workspace');

        // Simulate 6 minutes of inactivity while heartbeat still arrives -> auto-away
        OfficePresence::where('user_id', $user->id)->update([
            'last_activity_at' => now()->subMinutes(6),
            'last_seen_at' => now(),
        ]);

        $this->actingAs($user)
            ->postJson('/virtual-office/presence/heartbeat', ['has_activity' => false])
            ->assertOk()
            ->assertJsonPath('myPresence.status_key', 'away');

        // Activity resumes -> back to online
        $this->actingAs($user)
            ->postJson('/virtual-office/presence/heartbeat', ['has_activity' => true])
            ->assertOk()
            ->assertJsonPath('myPresence.status_key', 'online');

        // Stale heartbeat (>90s) -> swept to offline
        OfficePresence::where('user_id', $user->id)->update([
            'last_seen_at' => now()->subSeconds(120),
        ]);

        $swept = $service->sweepStalePresences();
        $this->assertGreaterThanOrEqual(1, $swept);
        $this->assertSame('offline', OfficePresence::where('user_id', $user->id)->value('status'));
    }

    public function test_two_authenticated_user_sessions_reflect_distinct_live_presence_and_disconnect(): void
    {
        $userA = User::factory()->create(['is_active' => true]);
        $userB = User::factory()->create(['is_active' => true]);

        $this->actingAs($userA)
            ->patchJson('/virtual-office/presence', [
                'status' => 'busy',
                'custom_status_text' => '<b>Deep work</b> sprint',
                'custom_status_emoji' => '🚀',
                'expires_in' => '1h',
                'zone_slug' => 'project',
            ])
            ->assertOk()
            ->assertJsonPath('myPresence.status_key', 'busy')
            ->assertJsonPath('myPresence.custom_status_text', 'Deep work sprint')
            ->assertJsonPath('myPresence.zone', 'project');

        $this->actingAs($userB)
            ->patchJson('/virtual-office/presence', [
                'status' => 'available',
                'zone_slug' => 'lounge',
            ])
            ->assertOk()
            ->assertJsonPath('myPresence.status_key', 'available')
            ->assertJsonPath('myPresence.zone', 'lounge');

        // Verify both appear with their respective live states
        $snapshot = $this->actingAs($userA)
            ->getJson('/virtual-office/presence/snapshot')
            ->assertOk()
            ->json('members');
        $byId = collect($snapshot)->keyBy('id');

        $this->assertSame('busy', $byId[$userA->id]['status_key']);
        $this->assertSame('available', $byId[$userB->id]['status_key']);

        // User B disconnects -> only User B becomes offline
        $this->actingAs($userB)->postJson('/virtual-office/presence/disconnect')->assertOk();

        $afterDisconnect = $this->actingAs($userA)
            ->getJson('/virtual-office/presence/snapshot')
            ->assertOk()
            ->json('members');
        $byIdAfter = collect($afterDisconnect)->keyBy('id');

        $this->assertSame('busy', $byIdAfter[$userA->id]['status_key']);
        $this->assertSame('offline', $byIdAfter[$userB->id]['status_key']);
        $this->assertDatabaseHas('office_presence_logs', ['user_id' => $userA->id, 'status' => 'busy']);
        $this->assertGreaterThanOrEqual(5, OfficeZone::count());
    }
}

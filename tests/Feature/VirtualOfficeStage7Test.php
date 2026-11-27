<?php

namespace Tests\Feature;

use App\Domain\VirtualOffice\Models\OfficeEvent;
use App\Domain\VirtualOffice\Models\OfficeMessage;
use App\Domain\VirtualOffice\Models\OfficePresence;
use App\Domain\VirtualOffice\Models\OfficePresenceLog;
use App\Domain\VirtualOffice\Models\OfficeZone;
use App\Domain\VirtualOffice\Services\PresenceService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class VirtualOfficeStage7Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RbacSeeder::class);
        $this->seed(\Database\Seeders\VirtualOfficeSeeder::class);
    }

    public function test_prune_command_removes_records_older_than_retention_window_and_keeps_recent(): void
    {
        $user = User::factory()->create(['is_active' => true]);
        $zone = OfficeZone::query()->where('slug', 'reception')->firstOrFail();

        $oldTime = now()->subDays(100);
        $recentTime = now()->subDays(5);

        $oldLog = OfficePresenceLog::create([
            'user_id' => $user->id,
            'zone_id' => $zone->id,
            'status' => 'online',
            'started_at' => $oldTime,
        ]);
        $recentLog = OfficePresenceLog::create([
            'user_id' => $user->id,
            'zone_id' => $zone->id,
            'status' => 'online',
            'started_at' => $recentTime,
        ]);

        $oldMsg = OfficeMessage::create([
            'scope' => 'zone',
            'zone_id' => $zone->id,
            'sender_id' => $user->id,
            'body' => 'Old message',
        ]);
        OfficeMessage::query()->whereKey($oldMsg->id)->update(['created_at' => $oldTime]);

        $recentMsg = OfficeMessage::create([
            'scope' => 'zone',
            'zone_id' => $zone->id,
            'sender_id' => $user->id,
            'body' => 'Recent message',
        ]);

        $oldEvent = OfficeEvent::create([
            'type' => 'member_moved',
            'actor_id' => $user->id,
            'zone_id' => $zone->id,
            'created_at' => $oldTime,
        ]);

        $exit = Artisan::call('kdms:prune-virtual-office-data', ['--days' => 90]);
        $this->assertSame(0, $exit);

        $this->assertDatabaseMissing('office_presence_logs', ['id' => $oldLog->id]);
        $this->assertDatabaseHas('office_presence_logs', ['id' => $recentLog->id]);
        $this->assertDatabaseMissing('office_messages', ['id' => $oldMsg->id]);
        $this->assertDatabaseHas('office_messages', ['id' => $recentMsg->id]);
        $this->assertDatabaseMissing('office_events', ['id' => $oldEvent->id]);
    }

    public function test_global_search_returns_virtual_office_zones_and_members(): void
    {
        $user = User::factory()->create(['name' => 'Aldo Pratama', 'is_active' => true]);

        $res = $this->actingAs($user)->getJson('/search?q=Meeting');
        $res->assertOk();
        $groups = collect($res->json('groups'));
        $voGroup = $groups->firstWhere('module', 'Virtual Office');
        $this->assertNotNull($voGroup);
        $this->assertStringContainsString('/virtual-office?zone=meeting', $voGroup['items'][0]['url']);

        $resMember = $this->actingAs($user)->getJson('/search?q=Aldo');
        $resMember->assertOk();
        $voMemberGroup = collect($resMember->json('groups'))->firstWhere('module', 'Virtual Office');
        $this->assertNotNull($voMemberGroup);
        $this->assertStringContainsString("/virtual-office?member={$user->id}", $voMemberGroup['items'][0]['url']);
    }

    public function test_deactivated_zone_falls_back_safely_to_reception_on_heartbeat(): void
    {
        $user = User::factory()->create(['is_active' => true]);
        $reception = OfficeZone::query()->where('slug', 'reception')->firstOrFail();
        $lounge = OfficeZone::query()->where('slug', 'lounge')->firstOrFail();

        $presenceService = app(PresenceService::class);
        $presenceService->heartbeat($user, true, 'lounge');

        $lounge->update(['is_active' => false]);

        $updated = $presenceService->heartbeat($user, true);
        $this->assertSame($reception->id, $updated->zone_id);
        $this->assertNull($updated->seat_id);
        $this->assertDatabaseHas('office_presence', [
            'user_id' => $user->id,
            'zone_id' => $reception->id,
        ]);
    }
}

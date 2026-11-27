<?php

namespace Tests\Feature;

use App\Domain\VirtualOffice\Models\OfficeSeat;
use App\Domain\VirtualOffice\Models\OfficeZone;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Database\Seeders\VirtualOfficeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class VirtualOfficeStage2Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->seed(VirtualOfficeSeeder::class);
        Event::fake();
    }

    public function test_user_can_move_to_zone_and_coordinates_persist(): void
    {
        $user = User::factory()->create(['is_active' => true]);

        $this->actingAs($user)
            ->postJson('/virtual-office/presence/move', [
                'zone_slug' => 'project',
                'pos_x' => 7.2,
                'pos_z' => 4.8,
            ])
            ->assertOk()
            ->assertJsonPath('myPresence.zone', 'project')
            ->assertJsonPath('myPresence.pos_x', 7.2)
            ->assertJsonPath('myPresence.pos_z', 4.8);
    }

    public function test_zone_capacity_is_enforced_for_regular_members_and_bypassed_for_admin(): void
    {
        $lounge = OfficeZone::where('slug', 'lounge')->firstOrFail();
        $lounge->update(['capacity' => 1]);

        $userA = User::factory()->create(['is_active' => true]);
        $userB = User::factory()->create(['is_active' => true]);
        $admin = User::factory()->create(['is_active' => true]);
        $admin->assignRole(User::ROLE_FOUNDER);

        $this->actingAs($userA)
            ->postJson('/virtual-office/presence/move', ['zone_slug' => 'lounge'])
            ->assertOk();

        // Regular member blocked when capacity (1/1) is full
        $this->actingAs($userB)
            ->postJson('/virtual-office/presence/move', ['zone_slug' => 'lounge'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('zone_slug');

        // Super Admin can still enter
        $this->actingAs($admin)
            ->postJson('/virtual-office/presence/move', ['zone_slug' => 'lounge'])
            ->assertOk();
    }

    public function test_seat_sit_conflict_and_stand_up_workflow(): void
    {
        $seat = OfficeSeat::where('seat_key', 'desk-1')->firstOrFail();
        $userA = User::factory()->create(['is_active' => true]);
        $userB = User::factory()->create(['is_active' => true]);

        // User A sits on desk-1
        $this->actingAs($userA)
            ->postJson('/virtual-office/presence/seat', ['seat_id' => $seat->id])
            ->assertOk()
            ->assertJsonPath('myPresence.seat_id', $seat->id);

        // User B attempts to sit on the same occupied desk-1 -> 422 conflict
        $this->actingAs($userB)
            ->postJson('/virtual-office/presence/seat', ['seat_id' => $seat->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('seat_id');

        // User A stands up -> frees the seat
        $this->actingAs($userA)
            ->postJson('/virtual-office/presence/seat', ['seat_id' => null])
            ->assertOk()
            ->assertJsonPath('myPresence.seat_id', null);

        // Now User B can sit on desk-1
        $this->actingAs($userB)
            ->postJson('/virtual-office/presence/seat', ['seat_id' => $seat->id])
            ->assertOk()
            ->assertJsonPath('myPresence.seat_id', $seat->id);
    }

    public function test_assigned_fixed_desk_blocks_other_members(): void
    {
        $owner = User::factory()->create(['is_active' => true]);
        $other = User::factory()->create(['is_active' => true]);

        $seat = OfficeSeat::where('seat_key', 'desk-2')->firstOrFail();
        $seat->update(['assigned_user_id' => $owner->id, 'is_hot_desk' => false]);

        $this->actingAs($other)
            ->postJson('/virtual-office/presence/seat', ['seat_id' => $seat->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('seat_id');

        $this->actingAs($owner)
            ->postJson('/virtual-office/presence/seat', ['seat_id' => $seat->id])
            ->assertOk()
            ->assertJsonPath('myPresence.seat_id', $seat->id);
    }
}

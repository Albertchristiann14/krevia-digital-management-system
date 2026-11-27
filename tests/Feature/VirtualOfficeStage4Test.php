<?php

namespace Tests\Feature;

use App\Domain\Governance\Models\ActionItem;
use App\Domain\Governance\Models\Meeting;
use App\Domain\VirtualOffice\Events\OfficeMeetingUpdated;
use App\Domain\VirtualOffice\Models\OfficeMessage;
use App\Domain\VirtualOffice\Models\OfficeZone;
use App\Domain\Workplan\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class VirtualOfficeStage4Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RbacSeeder::class);
        $this->seed(\Database\Seeders\VirtualOfficeSeeder::class);
    }

    public function test_instant_meeting_join_notes_action_item_to_task_and_end_workflow(): void
    {
        Event::fake([OfficeMeetingUpdated::class]);

        $host = User::factory()->create(['is_active' => true]);
        $member = User::factory()->create(['is_active' => true]);
        $meetingZone = OfficeZone::query()->where('slug', 'meeting')->firstOrFail();

        $res = $this->actingAs($host)->postJson('/virtual-office/meetings/instant', [
            'focus' => 'Sprint Kickoff',
            'agenda' => 'Align deliverables',
            'zone_id' => $meetingZone->id,
            'invite_user_ids' => [$member->id],
        ]);

        $res->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('meeting.is_live', true)
            ->assertJsonPath('meeting.focus', 'Sprint Kickoff');

        $meetingId = $res->json('meeting.id');
        Event::assertDispatched(OfficeMeetingUpdated::class);

        // Member joins meeting
        $this->actingAs($member)->postJson("/virtual-office/meetings/{$meetingId}/join")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertDatabaseHas('office_meeting_participants', [
            'meeting_id' => $meetingId,
            'user_id' => $member->id,
            'rsvp_status' => 'accepted',
            'is_in_call' => 1,
        ]);

        // Save collaborative notes
        $this->actingAs($host)->postJson("/virtual-office/meetings/{$meetingId}/notes", [
            'summary' => 'Agreed on Stage 4 architecture.',
            'decisions_summary' => 'Ship Jitsi integration.',
        ])->assertOk();

        $this->assertDatabaseHas('meeting_minutes', [
            'meeting_id' => $meetingId,
            'summary' => 'Agreed on Stage 4 architecture.',
        ]);

        // Add action item & convert to real Task in 1 click
        $this->actingAs($host)->postJson("/virtual-office/meetings/{$meetingId}/action-items", [
            'title' => 'Deploy Stage 4 to VPS',
            'pic_user_id' => $member->id,
            'due_date' => now()->addDays(2)->toDateString(),
        ])->assertOk();

        $actionItem = ActionItem::query()->where('meeting_id', $meetingId)->firstOrFail();

        $conv = $this->actingAs($host)->postJson("/virtual-office/action-items/{$actionItem->id}/convert-task");
        $conv->assertOk()->assertJsonPath('ok', true);

        $taskId = $conv->json('task.id');
        $this->assertDatabaseHas('tasks', [
            'id' => $taskId,
            'title' => 'Deploy Stage 4 to VPS',
            'pic_user_id' => $member->id,
        ]);
        $this->assertSame($taskId, $actionItem->fresh()->linked_task_id);
        $this->assertNotNull(Task::query()->find($taskId));

        // End meeting
        $this->actingAs($host)->postJson("/virtual-office/meetings/{$meetingId}/end")
            ->assertOk()
            ->assertJsonPath('meeting.is_live', false)
            ->assertJsonPath('meeting.status', 'Completed');
    }

    public function test_schedule_meeting_prevents_room_double_booking_and_reports_slots(): void
    {
        Event::fake([OfficeMeetingUpdated::class]);

        $user = User::factory()->create(['is_active' => true]);
        $meetingZone = OfficeZone::query()->where('slug', 'meeting')->firstOrFail();
        $date = now()->addDay()->toDateString();

        $this->actingAs($user)->postJson('/virtual-office/meetings/schedule', [
            'focus' => 'Architecture Review',
            'scheduled_date' => $date,
            'scheduled_time' => '10:00',
            'duration_minutes' => 60,
            'zone_id' => $meetingZone->id,
        ])->assertOk();

        // Overlapping 10:30 slot in same zone must be rejected
        $this->actingAs($user)->postJson('/virtual-office/meetings/schedule', [
            'focus' => 'Conflicting Sync',
            'scheduled_date' => $date,
            'scheduled_time' => '10:30',
            'duration_minutes' => 30,
            'zone_id' => $meetingZone->id,
        ])->assertStatus(422);

        $slotsRes = $this->actingAs($user)->getJson("/virtual-office/meetings/slots?date={$date}&zone_id={$meetingZone->id}");
        $slotsRes->assertOk();
        $slot1000 = collect($slotsRes->json('slots'))->firstWhere('time', '10:00');
        $this->assertFalse($slot1000['available']);
    }

    public function test_locked_meeting_blocks_uninvited_user_and_quick_call_sends_dm(): void
    {
        Event::fake([OfficeMeetingUpdated::class]);

        $host = User::factory()->create(['is_active' => true]);
        $outsider = User::factory()->create(['is_active' => true]);
        $meetingZone = OfficeZone::query()->where('slug', 'meeting')->firstOrFail();

        $res = $this->actingAs($host)->postJson('/virtual-office/meetings/instant', [
            'focus' => 'Executive Closed Sync',
            'zone_id' => $meetingZone->id,
            'is_locked' => true,
        ])->assertOk();

        $meetingId = $res->json('meeting.id');

        $this->actingAs($outsider)->postJson("/virtual-office/meetings/{$meetingId}/join")
            ->assertStatus(422);

        // Quick call sends DM invite with meet.jit.si link
        $callRes = $this->actingAs($host)->postJson("/virtual-office/call/{$outsider->id}")
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertStringContainsString('https://meet.jit.si/', $callRes->json('call.join_url'));
        $this->assertDatabaseHas('office_messages', [
            'scope' => 'dm',
            'sender_id' => $host->id,
            'recipient_id' => $outsider->id,
        ]);
    }
}

<?php

namespace Tests\Feature;

use App\Domain\VirtualOffice\Models\OfficeKnock;
use App\Domain\VirtualOffice\Models\OfficeMessage;
use App\Domain\VirtualOffice\Models\OfficeZone;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Database\Seeders\VirtualOfficeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class VirtualOfficeStage3Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->seed(VirtualOfficeSeeder::class);
        Event::fake();
    }

    public function test_zone_chat_send_edit_react_read_and_delete(): void
    {
        $userA = User::factory()->create(['is_active' => true]);
        $userB = User::factory()->create(['is_active' => true]);
        $zone = OfficeZone::where('slug', 'workspace')->firstOrFail();

        // Send message
        $sendRes = $this->actingAs($userA)
            ->postJson('/virtual-office/messages', [
                'scope' => 'zone',
                'zone_id' => $zone->id,
                'body' => '<script>alert(1)</script>Halo tim workspace!',
            ])
            ->assertCreated();

        $msgId = $sendRes->json('message.id');
        $this->assertSame('alert(1)Halo tim workspace!', $sendRes->json('message.body'));

        // Other user cannot edit User A's message
        $this->actingAs($userB)
            ->patchJson("/virtual-office/messages/{$msgId}", ['body' => 'Hacked'])
            ->assertForbidden();

        // User A edits own message
        $this->actingAs($userA)
            ->patchJson("/virtual-office/messages/{$msgId}", ['body' => 'Halo semua!'])
            ->assertOk()
            ->assertJsonPath('message.body', 'Halo semua!');

        // User B reacts 👍 and marks zone read
        $this->actingAs($userB)
            ->postJson("/virtual-office/messages/{$msgId}/react", ['emoji' => '👍'])
            ->assertOk()
            ->assertJsonPath('message.reactions.👍.0', $userB->id);

        $this->actingAs($userB)
            ->postJson('/virtual-office/messages/read', ['scope' => 'zone', 'zone_id' => $zone->id])
            ->assertOk();

        $this->assertDatabaseHas('office_message_reads', ['message_id' => $msgId, 'user_id' => $userB->id]);

        // User A soft-deletes own message
        $this->actingAs($userA)
            ->deleteJson("/virtual-office/messages/{$msgId}")
            ->assertOk();

        $this->assertSoftDeleted('office_messages', ['id' => $msgId]);
    }

    public function test_dm_respects_dnd_and_only_admin_can_send_urgent(): void
    {
        $sender = User::factory()->create(['is_active' => true]);
        $admin = User::factory()->create(['is_active' => true]);
        $admin->assignRole(User::ROLE_FOUNDER);
        $dndUser = User::factory()->create(['is_active' => true]);

        $this->actingAs($dndUser)
            ->patchJson('/virtual-office/presence', ['status' => 'dnd'])
            ->assertOk();

        // Regular member DM to DND user -> saved silently, urgent flag ignored
        $res1 = $this->actingAs($sender)
            ->postJson('/virtual-office/messages', [
                'scope' => 'dm',
                'recipient_id' => $dndUser->id,
                'body' => 'Permisi cek task',
                'is_urgent' => true,
            ])
            ->assertCreated();
        $this->assertFalse($res1->json('message.is_urgent'));

        // Founder DM with urgent -> is_urgent = true
        $res2 = $this->actingAs($admin)
            ->postJson('/virtual-office/messages', [
                'scope' => 'dm',
                'recipient_id' => $dndUser->id,
                'body' => 'Urgent deployment review',
                'is_urgent' => true,
            ])
            ->assertCreated();
        $this->assertTrue($res2->json('message.is_urgent'));
    }

    public function test_knock_rate_limit_and_respond_workflow(): void
    {
        $sender = User::factory()->create(['is_active' => true]);
        $target = User::factory()->create(['is_active' => true]);

        // Send 3 knocks (max per hour)
        $knock1 = $this->actingAs($sender)
            ->postJson('/virtual-office/knocks', ['to_user_id' => $target->id, 'message' => 'Bisa diskusi sebentar?'])
            ->assertCreated()
            ->json('knock.id');

        $this->actingAs($sender)->postJson('/virtual-office/knocks', ['to_user_id' => $target->id])->assertCreated();
        $this->actingAs($sender)->postJson('/virtual-office/knocks', ['to_user_id' => $target->id])->assertCreated();

        // 4th knock within 1 hour -> rejected (422)
        $this->actingAs($sender)
            ->postJson('/virtual-office/knocks', ['to_user_id' => $target->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('to_user_id');

        // Sender cannot respond to own knock
        $this->actingAs($sender)
            ->postJson("/virtual-office/knocks/{$knock1}/respond", ['status' => 'accepted'])
            ->assertForbidden();

        // Target accepts knock
        $this->actingAs($target)
            ->postJson("/virtual-office/knocks/{$knock1}/respond", ['status' => 'accepted'])
            ->assertOk()
            ->assertJsonPath('knock.status', 'accepted');

        $this->assertSame('accepted', OfficeKnock::find($knock1)->status);
    }
}

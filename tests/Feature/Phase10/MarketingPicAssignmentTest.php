<?php

namespace Tests\Feature\Phase10;

use App\Domain\Marketing\Models\ContentItem;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MarketingPicAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_can_create_content_with_selected_pic_or_null_without_hardcoding_jihanz(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();
        $jihanz = User::where('email', 'jihanz@kreviadigital.com')->firstOrFail();

        // 1. Create with explicit PIC (Farizy) — must NOT default to Jihanz
        $this->actingAs($jihanz)
            ->post('/marketing/content', [
                'platform' => 'Instagram Feed',
                'category' => 'Company Introduction',
                'title_topic' => 'Custom PIC Content',
                'pic_user_id' => $farizy->id,
                'publish_date' => '2027-03-10',
            ])
            ->assertRedirect();

        $created = ContentItem::where('title_topic', 'Custom PIC Content')->firstOrFail();
        $this->assertSame($farizy->id, $created->pic_user_id);

        // 2. Create without PIC (null)
        $this->actingAs($jihanz)
            ->post('/marketing/content', [
                'platform' => 'LinkedIn',
                'category' => 'Company Updates',
                'title_topic' => 'Unassigned PIC Content',
                'pic_user_id' => null,
                'publish_date' => '2027-03-12',
            ])
            ->assertRedirect();

        $unassigned = ContentItem::where('title_topic', 'Unassigned PIC Content')->firstOrFail();
        $this->assertNull($unassigned->pic_user_id);
    }

    public function test_can_change_pic_and_preserve_other_fields_and_refresh_consistently(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $jihanz = User::where('email', 'jihanz@kreviadigital.com')->firstOrFail();
        $farizy = User::where('email', 'farizy@kreviadigital.com')->firstOrFail();

        $item = ContentItem::create([
            'code' => 'C-991',
            'platform' => 'Instagram Feed',
            'category' => 'Company Introduction',
            'title_topic' => 'Original Topic',
            'caption' => 'Keep this caption',
            'pic_user_id' => $jihanz->id,
            'reviewer_user_id' => $albert->id,
            'publish_date' => '2027-04-01',
            'status' => 'In Production',
        ]);

        // Change PIC from Jihanz to Farizy
        $this->actingAs($jihanz)
            ->patch("/marketing/content/{$item->id}", [
                'pic_user_id' => $farizy->id,
            ])
            ->assertRedirect();

        $item->refresh();
        $this->assertSame($farizy->id, $item->pic_user_id);
        $this->assertSame($albert->id, $item->reviewer_user_id);
        $this->assertSame('In Production', $item->status);
        $this->assertSame('Keep this caption', $item->caption);

        // Edit without pic_user_id preserves existing PIC
        $this->actingAs($jihanz)
            ->patch("/marketing/content/{$item->id}", [
                'title_topic' => 'Edited Topic Without Touching PIC',
            ])
            ->assertRedirect();

        $this->assertSame($farizy->id, $item->fresh()->pic_user_id);

        // Change PIC back to Jihanz and verify detail & calendar index
        $this->actingAs($jihanz)
            ->patch("/marketing/content/{$item->id}", [
                'pic_user_id' => $jihanz->id,
            ])
            ->assertRedirect();

        $this->actingAs($jihanz)
            ->get("/marketing/content/{$item->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('item.pic_user_id', $jihanz->id)
                ->where('item.pic_name', $jihanz->name)
            );

        $this->actingAs($jihanz)
            ->get('/marketing/content?view=table&search=C-991')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('items.0.pic_name', $jihanz->name)
            );
    }

    public function test_invalid_inactive_and_unauthorized_pic_updates_are_rejected(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $jihanz = User::where('email', 'jihanz@kreviadigital.com')->firstOrFail();
        $inactive = User::factory()->create(['is_active' => false]);
        $item = ContentItem::query()->firstOrFail();

        // Invalid user ID
        $this->actingAs($jihanz)
            ->post('/marketing/content', [
                'platform' => 'Instagram Feed',
                'category' => 'Company Introduction',
                'title_topic' => 'Bad User',
                'pic_user_id' => 999999,
                'publish_date' => '2027-04-05',
            ])
            ->assertSessionHasErrors('pic_user_id');

        // Inactive user
        $this->actingAs($jihanz)
            ->patch("/marketing/content/{$item->id}", [
                'pic_user_id' => $inactive->id,
            ])
            ->assertSessionHasErrors('pic_user_id');

        // Unauthorized user
        $restrictedRole = Role::create(['name' => 'NoMarketingEdit', 'guard_name' => 'web']);
        $restrictedUser = User::factory()->create(['is_active' => true]);
        $restrictedUser->assignRole($restrictedRole);

        $this->actingAs($restrictedUser)
            ->patch("/marketing/content/{$item->id}", [
                'pic_user_id' => $albert->id,
            ])
            ->assertForbidden();
    }
}

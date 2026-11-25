<?php

namespace Tests\Feature\Phase4;

use App\Domain\Marketing\Models\ContentItem;
use App\Domain\Portfolio\Models\DemoCriteriaCheck;
use App\Domain\Portfolio\Models\DemoProduct;
use App\Domain\Portfolio\Services\PortfolioAndMarketingWorkbookImporter;
use App\Models\User;
use App\Notifications\MarketingDeadlineNotification;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PortfolioAndMarketingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_sheet10_and_sheet11_import_6_demos_and_158_contents_idempotently(): void
    {
        $this->assertEquals(6, DemoProduct::count());
        $this->assertEquals(36, DemoCriteriaCheck::count());
        $this->assertEquals(158, ContentItem::count());

        $pd06 = DemoProduct::where('code', 'PD-06')->firstOrFail();
        $this->assertTrue($pd06->is_conditional);
        $this->assertEquals('Perlu Konfirmasi Manajemen', $pd06->data_status);
        $this->assertEquals('contoh internal', $pd06->label_type);

        $pd01 = DemoProduct::where('code', 'PD-01')->firstOrFail();
        $pd01->update(['staging_url' => 'https://demo.kreviadigital.com/corporate']);

        $summary = app(PortfolioAndMarketingWorkbookImporter::class)->import(
            storage_path('app/private/seed/workplan_2026_2027.xlsx'),
            preserveExisting: true
        );

        $this->assertEquals(6, $summary['demos_skipped']);
        $this->assertEquals(158, $summary['contents_skipped']);
        $this->assertEquals('https://demo.kreviadigital.com/corporate', $pd01->fresh()->staging_url);
    }

    public function test_max_two_active_demos_and_six_criteria_dual_approval_gate(): void
    {
        $aldo = User::where('email', 'aldo@kreviadigital.com')->firstOrFail();
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $ananta = User::where('email', 'ananta@kreviadigital.com')->firstOrFail();

        $pd01 = DemoProduct::where('code', 'PD-01')->firstOrFail();
        $pd02 = DemoProduct::where('code', 'PD-02')->firstOrFail();
        $pd03 = DemoProduct::where('code', 'PD-03')->firstOrFail();

        // 1. Max 2 active demos concurrently
        $this->actingAs($aldo)->post("/portfolio/demos/{$pd01->id}/status", ['status' => 'In Progress'])->assertRedirect();
        $this->actingAs($aldo)->post("/portfolio/demos/{$pd02->id}/status", ['status' => 'In Progress'])->assertRedirect();
        $this->actingAs($aldo)->post("/portfolio/demos/{$pd03->id}/status", ['status' => 'In Progress'])->assertSessionHasErrors('status');

        // 2. Cannot mark Ready to Present before 6 criteria
        $this->actingAs($aldo)->post("/portfolio/demos/{$pd01->id}/status", ['status' => 'Ready to Present'])->assertSessionHasErrors('status');

        // 3. Cannot manually toggle criterion #6 (dual_approved)
        $dualCheck = $pd01->criteriaChecks()->where('criterion_key', 'dual_approved')->firstOrFail();
        $this->actingAs($aldo)
            ->post("/portfolio/demos/{$pd01->id}/criteria/{$dualCheck->id}", ['is_met' => true])
            ->assertSessionHasErrors('criterion');

        // 4. Role separation on dual approval
        $this->actingAs($ananta)->post("/portfolio/demos/{$pd01->id}/approve-technical")->assertForbidden();
        $this->actingAs($albert)->post("/portfolio/demos/{$pd01->id}/approve-technical")->assertForbidden();
        $this->actingAs($aldo)->post("/portfolio/demos/{$pd01->id}/approve-commercial")->assertForbidden();

        // 5. Complete criteria 1..5 + Aldo + Albert dual approval -> auto Ready to Present
        foreach ($pd01->criteriaChecks()->where('criterion_key', '!=', 'dual_approved')->get() as $check) {
            $this->actingAs($ananta)->post("/portfolio/demos/{$pd01->id}/criteria/{$check->id}", [
                'is_met' => true,
                'evidence_note' => 'Verified cleanly.',
            ])->assertRedirect();
        }

        $this->actingAs($aldo)->post("/portfolio/demos/{$pd01->id}/approve-technical")->assertRedirect();
        $this->assertFalse($pd01->fresh()->is_ready_to_present);

        $this->actingAs($albert)->post("/portfolio/demos/{$pd01->id}/approve-commercial")->assertRedirect();

        $pd01->refresh();
        $this->assertTrue($pd01->is_ready_to_present);
        $this->assertEquals('Ready to Present', $pd01->status);
        $this->assertTrue($dualCheck->fresh()->is_met);

        // 6. Cannot remove 'contoh internal' label without client permission
        $this->actingAs($aldo)->patch("/portfolio/demos/{$pd01->id}", [
            'label_type' => 'klien nyata',
            'client_permission_granted' => false,
        ])->assertSessionHasErrors('label_type');
    }

    public function test_marketing_reviewer_rbac_and_demo_readiness_publication_gate(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $aldo = User::where('email', 'aldo@kreviadigital.com')->firstOrFail();
        $jihanz = User::where('email', 'jihanz@kreviadigital.com')->firstOrFail();

        $showcasePost = ContentItem::where('category', 'Portfolio Showcase')->firstOrFail();
        $introPost = ContentItem::where('category', 'Company Introduction')->firstOrFail();

        // Jihanz cannot self-approve content
        $this->actingAs($jihanz)
            ->post("/marketing/content/{$introPost->id}/review", ['decision' => 'Approved'])
            ->assertForbidden();

        // Cannot schedule before approval
        $this->actingAs($jihanz)
            ->post("/marketing/content/{$introPost->id}/status", ['status' => 'Scheduled'])
            ->assertSessionHasErrors('status');

        // Albert approves non-demo intro post -> Jihanz can schedule & publish (requires URL)
        $this->actingAs($albert)
            ->post("/marketing/content/{$introPost->id}/review", ['decision' => 'Approved'])
            ->assertRedirect();

        $this->actingAs($jihanz)
            ->post("/marketing/content/{$introPost->id}/status", ['status' => 'Scheduled'])
            ->assertRedirect();

        $this->actingAs($jihanz)
            ->post("/marketing/content/{$introPost->id}/status", ['status' => 'Published'])
            ->assertSessionHasErrors('published_url');

        $this->actingAs($jihanz)
            ->post("/marketing/content/{$introPost->id}/status", [
                'status' => 'Published',
                'published_url' => 'https://instagram.com/p/krevia-intro',
            ])
            ->assertRedirect();

        $this->assertEquals('Published', $introPost->fresh()->status);

        // Hard Gate: Portfolio Showcase approved, but linked demo NOT Ready to Present -> blocked
        $this->actingAs($albert)
            ->post("/marketing/content/{$showcasePost->id}/review", ['decision' => 'Approved'])
            ->assertRedirect();

        $this->actingAs($jihanz)
            ->post("/marketing/content/{$showcasePost->id}/status", ['status' => 'Scheduled'])
            ->assertSessionHasErrors('status');

        // Make the linked demo Ready to Present
        $linkedDemo = $showcasePost->demoProduct ?? DemoProduct::where('code', 'PD-01')->firstOrFail();
        $showcasePost->update(['demo_product_id' => $linkedDemo->id]);

        foreach ($linkedDemo->criteriaChecks()->where('criterion_key', '!=', 'dual_approved')->get() as $c) {
            $c->update(['is_met' => true]);
        }
        $this->actingAs($aldo)->post("/portfolio/demos/{$linkedDemo->id}/approve-technical");
        $this->actingAs($albert)->post("/portfolio/demos/{$linkedDemo->id}/approve-commercial");
        $this->assertTrue($linkedDemo->fresh()->is_ready_to_present);

        // Now Portfolio Showcase post can be scheduled & published!
        $this->actingAs($jihanz)
            ->post("/marketing/content/{$showcasePost->id}/status", ['status' => 'Scheduled'])
            ->assertRedirect();

        $this->assertEquals('Scheduled', $showcasePost->fresh()->status);
    }

    public function test_content_deadline_command_and_phase4_inertia_pages(): void
    {
        Notification::fake();

        $jihanz = User::where('email', 'jihanz@kreviadigital.com')->firstOrFail();
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();

        $item = ContentItem::firstOrFail();
        $item->update([
            'production_date' => now()->subDays(2)->toDateString(),
            'review_date' => now()->toDateString(),
            'publish_date' => now()->addDays(2)->toDateString(),
            'status' => 'Planned',
        ]);

        $this->artisan('kdms:check-content-deadlines')->assertExitCode(0);
        Notification::assertSentTo($jihanz, MarketingDeadlineNotification::class);

        $demo = DemoProduct::firstOrFail();

        $this->actingAs($albert)
            ->get('/portfolio/demos')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Portfolio/Index')
                ->has('demos', 6)
            );

        $this->actingAs($albert)
            ->get("/portfolio/demos/{$demo->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Portfolio/Show')
                ->has('demo.criteria_checks', 6)
            );

        $this->actingAs($jihanz)
            ->get('/marketing/content')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Marketing/Index')
                ->has('items', 158)
            );

        $this->actingAs($jihanz)
            ->get("/marketing/content/{$item->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Marketing/Show'));
    }
}

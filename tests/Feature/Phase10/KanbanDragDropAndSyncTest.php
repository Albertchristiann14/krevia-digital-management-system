<?php

namespace Tests\Feature\Phase10;

use App\Domain\Crm\Models\Lead;
use App\Domain\Workplan\Models\Task;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class KanbanDragDropAndSyncTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_kanban_reorder_moves_task_across_columns_and_persists_order(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $tasks = Task::query()->orderBy('id')->take(3)->get();
        $this->assertCount(3, $tasks);

        [$t1, $t2, $t3] = [$tasks[0], $tasks[1], $tasks[2]];
        $t1->forceFill(['status' => 'Not Started', 'kanban_order' => 1])->save();
        $t2->forceFill(['status' => 'In Progress', 'kanban_order' => 1])->save();
        $t3->forceFill(['status' => 'In Progress', 'kanban_order' => 2])->save();

        // Move $t1 into 'In Progress' between $t2 and $t3
        $this->actingAs($albert)
            ->postJson('/tasks/reorder', [
                'task_id' => $t1->id,
                'status' => 'In Progress',
                'ordered_ids' => [$t3->id, $t1->id, $t2->id],
            ])
            ->assertOk()
            ->assertJson([
                'ok' => true,
                'task_id' => $t1->id,
                'status' => 'In Progress',
                'kanban_order' => 2,
            ]);

        $t1->refresh();
        $t2->refresh();
        $t3->refresh();

        $this->assertSame('In Progress', $t1->status);
        $this->assertSame(1, (int) $t3->kanban_order);
        $this->assertSame(2, (int) $t1->kanban_order);
        $this->assertSame(3, (int) $t2->kanban_order);
    }

    public function test_kanban_reorder_rejects_invalid_status_and_unauthorized_user(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $jihanz = User::where('email', 'jihanz@kreviadigital.com')->firstOrFail();

        $task = Task::query()->where('pic_user_id', $albert->id)->first()
            ?? Task::query()->firstOrFail();

        $this->actingAs($albert)
            ->postJson('/tasks/reorder', [
                'task_id' => $task->id,
                'status' => 'FakeColumn',
                'ordered_ids' => [$task->id],
            ])
            ->assertStatus(422);

        if ($task->pic_user_id !== $jihanz->id && $task->reviewer_user_id !== $jihanz->id) {
            $this->actingAs($jihanz)
                ->postJson('/tasks/reorder', [
                    'task_id' => $task->id,
                    'status' => 'In Progress',
                    'ordered_ids' => [$task->id],
                ])
                ->assertForbidden();
        }
    }

    public function test_uploaded_avatar_url_synchronizes_in_tasks_and_shared_auth_props(): void
    {
        Storage::fake('public');
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();

        $task = Task::query()->firstOrFail();
        $task->forceFill(['pic_user_id' => $albert->id])->save();

        $file = UploadedFile::fake()->image('sync-avatar.png', 200, 200);
        $this->actingAs($albert)
            ->post('/my-account/avatar', ['avatar' => $file])
            ->assertRedirect();

        $albert->refresh();
        $expectedUrl = $albert->avatarUrl();
        $this->assertNotNull($expectedUrl);

        $this->actingAs($albert)
            ->get('/tasks?view=kanban')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.user.avatar_url', $expectedUrl)
                ->where('tasks', function ($items) use ($task, $expectedUrl) {
                    foreach ($items as $item) {
                        if ($item['id'] === $task->id) {
                            return $item['pic_avatar_url'] === $expectedUrl;
                        }
                    }

                    return false;
                })
            );
    }

    public function test_crm_pipeline_kanban_reorder_moves_stage_and_persists_order(): void
    {
        $albert = User::where('email', 'albert@kreviadigital.com')->firstOrFail();
        $leads = Lead::query()->orderBy('id')->take(2)->get();
        $this->assertCount(2, $leads);

        [$l1, $l2] = [$leads[0], $leads[1]];
        $l1->forceFill(['stage' => 'Lead Identified', 'kanban_order' => 1])->save();
        $l2->forceFill(['stage' => 'Initial Contact', 'kanban_order' => 1])->save();

        $this->actingAs($albert)
            ->postJson('/crm/leads/reorder', [
                'lead_id' => $l1->id,
                'stage' => 'Initial Contact',
                'ordered_ids' => [$l2->id, $l1->id],
            ])
            ->assertOk()
            ->assertJson([
                'ok' => true,
                'lead_id' => $l1->id,
                'stage' => 'Initial Contact',
                'kanban_order' => 2,
            ]);

        $this->assertSame('Initial Contact', $l1->fresh()->stage);
        $this->assertSame(1, (int) $l2->fresh()->kanban_order);
        $this->assertSame(2, (int) $l1->fresh()->kanban_order);
    }
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('risks', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('category', 60)->index();
            $table->text('title');
            $table->unsignedTinyInteger('likelihood'); // 1..5
            $table->unsignedTinyInteger('impact');     // 1..5
            $table->unsignedTinyInteger('score');      // likelihood * impact
            $table->string('level', 30)->index();      // Rendah | Sedang | Tinggi
            $table->foreignId('pic_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('mitigation_plan');
            $table->text('contingency_plan')->nullable();
            $table->string('status', 30)->default('Open')->index();
            $table->date('last_reviewed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('risk_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('risk_id')->constrained('risks')->cascadeOnDelete();
            $table->foreignId('reviewer_user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('likelihood');
            $table->unsignedTinyInteger('impact');
            $table->unsignedTinyInteger('score');
            $table->string('level', 30);
            $table->text('notes')->nullable();
            $table->timestamp('reviewed_at');
            $table->timestamps();
        });

        Schema::create('meeting_forums', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('name');
            $table->text('purpose')->nullable();
            $table->string('frequency', 120);
            $table->string('duration', 60);
            $table->string('participants')->nullable();
            $table->text('standard_agenda')->nullable();
            $table->string('required_output')->nullable();
            $table->foreignId('pic_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('meetings', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->foreignId('forum_id')->nullable()->constrained('meeting_forums')->nullOnDelete();
            $table->string('forum_name', 120);
            $table->string('focus');
            $table->date('scheduled_date')->index();
            $table->string('scheduled_time', 20)->nullable();
            $table->string('status', 30)->default('Planned')->index();
            $table->foreignId('pic_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('agenda')->nullable();
            $table->timestamp('agenda_sent_at')->nullable();
            $table->text('participants_list')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('meeting_minutes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->unique()->constrained('meetings')->cascadeOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->cascadeOnDelete();
            $table->text('summary');
            $table->text('decisions_summary')->nullable();
            $table->text('escalations')->nullable();
            $table->timestamp('submitted_at');
            $table->boolean('is_within_24h_sla')->default(true);
            $table->timestamps();
        });

        Schema::create('decisions', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->date('decision_date')->nullable();
            $table->text('topic_decision');
            $table->date('deadline')->nullable();
            $table->string('status', 30)->default('Open')->index();
            $table->foreignId('pic_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('follow_up')->nullable();
            $table->string('data_status', 60)->default('Disepakati');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('source_meeting_id')->nullable()->constrained('meetings')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('action_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->constrained('meetings')->cascadeOnDelete();
            $table->string('title');
            $table->foreignId('pic_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('due_date')->nullable();
            $table->string('evidence_note')->nullable();
            $table->string('status', 30)->default('Open')->index();
            $table->foreignId('linked_task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('weekly_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('week_start_date')->index();
            $table->string('week_label', 40);
            $table->text('completed_tasks_summary');
            $table->text('in_progress_summary');
            $table->text('blockers_summary')->nullable();
            $table->text('next_week_plan');
            $table->timestamp('submitted_at');
            $table->timestamps();

            $table->unique(['user_id', 'week_start_date']);
        });

        Schema::create('quarterly_reviews', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('sort_order');
            $table->string('quarter_label', 40)->unique();
            $table->text('review_focus');
            $table->string('period_range', 60);
            $table->decimal('score', 5, 2)->nullable();
            $table->string('status', 30)->default('Planned');
            $table->text('key_decisions')->nullable();
            $table->text('action_plan')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('title');
            $table->string('category', 80)->index();
            $table->text('description')->nullable();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('file_path', 500);
            $table->string('original_filename');
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->string('version', 20)->default('v1.0');
            $table->string('data_status', 60)->default('Disepakati');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('import_batches', function (Blueprint $table) {
            $table->id();
            $table->string('filename');
            $table->string('mode', 20); // dry_run | apply
            $table->boolean('preserve_existing')->default(true);
            $table->json('summary_json');
            $table->foreignId('imported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_batches');
        Schema::dropIfExists('documents');
        Schema::dropIfExists('quarterly_reviews');
        Schema::dropIfExists('weekly_reports');
        Schema::dropIfExists('action_items');
        Schema::dropIfExists('decisions');
        Schema::dropIfExists('meeting_minutes');
        Schema::dropIfExists('meetings');
        Schema::dropIfExists('meeting_forums');
        Schema::dropIfExists('risk_reviews');
        Schema::dropIfExists('risks');
    }
};

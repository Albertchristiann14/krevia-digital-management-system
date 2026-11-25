<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('annual_roadmaps', function (Blueprint $table) {
            $table->id();
            $table->date('period_month')->unique(); // YYYY-MM-01
            $table->string('month_label', 40);
            $table->string('phase_label', 120);
            $table->text('primary_focus');
            $table->text('target_summary')->nullable();
            $table->text('priority_work')->nullable();
            $table->text('expected_output')->nullable();
            $table->foreignId('pic_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('success_indicator')->nullable();
            $table->unsignedInteger('target_contacts')->default(0);
            $table->unsignedInteger('target_meetings')->default(0);
            $table->unsignedInteger('target_proposals')->default(0);
            $table->unsignedInteger('target_won')->default(0);
            $table->string('target_status', 40)->default('Usulan'); // Disepakati | Usulan | Perlu Konfirmasi Manajemen
            $table->timestamps();
        });

        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique(); // T-001..
            $table->foreignId('annual_roadmap_id')->nullable()->constrained('annual_roadmaps')->nullOnDelete();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->text('expected_result')->nullable();
            $table->foreignId('pic_user_id')->constrained('users');
            $table->foreignId('reviewer_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('priority', 20)->default('Sedang'); // Tinggi | Sedang | Rendah
            $table->date('start_date')->nullable();
            $table->date('deadline');
            $table->string('status', 30)->default('Not Started'); // Not Started | In Progress | Under Review | Completed | On Hold | Cancelled
            $table->unsignedTinyInteger('progress_pct')->default(0);
            $table->boolean('is_blocked')->default(false);
            $table->text('blocker_note')->nullable();
            $table->timestamp('blocker_reported_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['pic_user_id', 'status']);
            $table->index(['deadline', 'status']);
            $table->index('annual_roadmap_id');
        });

        Schema::create('monthly_workplans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('annual_roadmap_id')->constrained('annual_roadmaps')->cascadeOnDelete();
            $table->foreignId('task_id')->unique()->constrained('tasks')->cascadeOnDelete();
            $table->string('stage_label', 150)->nullable();
            $table->text('expected_evidence')->nullable();
            $table->text('evaluation_notes')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('subtasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->string('title', 255);
            $table->boolean('is_completed')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('task_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('depends_on_task_id')->constrained('tasks')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['task_id', 'depends_on_task_id']);
        });

        Schema::create('task_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('task_evidences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->string('type', 20)->default('url'); // file | url | commit
            $table->string('title', 255);
            $table->string('url', 500)->nullable();
            $table->string('file_path', 500)->nullable();
            $table->string('original_name', 255)->nullable();
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('task_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('type');
                $table->morphs('notifiable');
                $table->text('data');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('task_status_histories');
        Schema::dropIfExists('task_evidences');
        Schema::dropIfExists('task_comments');
        Schema::dropIfExists('task_dependencies');
        Schema::dropIfExists('subtasks');
        Schema::dropIfExists('monthly_workplans');
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('annual_roadmaps');
    }
};

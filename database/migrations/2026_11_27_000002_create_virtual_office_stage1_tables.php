<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('office_zones')) {
            Schema::create('office_zones', function (Blueprint $table) {
                $table->id();
                $table->string('code', 24)->unique();
                $table->string('slug', 40)->unique();
                $table->string('name', 120);
                $table->string('type', 32); // reception|workspace|meeting|lounge|project
                $table->text('description')->nullable();
                $table->unsignedSmallInteger('capacity')->default(8);
                $table->string('color', 20)->default('#2563EB');
                $table->json('layout_config')->nullable();
                $table->boolean('is_active')->default(true);
                $table->foreignId('linked_project_id')->nullable()->constrained('projects')->nullOnDelete();
                $table->timestamps();

                $table->index(['type', 'is_active']);
            });
        }

        if (! Schema::hasTable('office_seats')) {
            Schema::create('office_seats', function (Blueprint $table) {
                $table->id();
                $table->foreignId('zone_id')->constrained('office_zones')->cascadeOnDelete();
                $table->string('seat_key', 64);
                $table->decimal('pos_x', 6, 2)->default(0);
                $table->decimal('pos_y', 6, 2)->default(0);
                $table->decimal('pos_z', 6, 2)->default(0);
                $table->decimal('rotation', 6, 3)->default(0);
                $table->string('type', 24)->default('desk'); // desk|sofa|meeting|standing
                $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->boolean('is_hot_desk')->default(true);
                $table->timestamps();

                $table->unique(['zone_id', 'seat_key']);
                $table->index('assigned_user_id');
            });
        }

        if (! Schema::hasTable('office_presence')) {
            Schema::create('office_presence', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
                $table->string('status', 24)->default('offline'); // online|available|busy|away|dnd|offline
                $table->string('custom_status_text', 80)->nullable();
                $table->string('custom_status_emoji', 16)->nullable();
                $table->timestamp('custom_status_expires_at')->nullable();
                $table->foreignId('zone_id')->nullable()->constrained('office_zones')->nullOnDelete();
                $table->foreignId('seat_id')->nullable()->constrained('office_seats')->nullOnDelete();
                $table->decimal('pos_x', 6, 2)->nullable();
                $table->decimal('pos_y', 6, 2)->nullable();
                $table->decimal('pos_z', 6, 2)->nullable();
                $table->foreignId('current_task_id')->nullable()->constrained('tasks')->nullOnDelete();
                $table->boolean('hide_current_task')->default(false);
                $table->unsignedSmallInteger('active_sessions_count')->default(0);
                $table->timestamp('last_seen_at')->nullable();
                $table->timestamp('last_activity_at')->nullable();
                $table->timestamps();

                $table->index(['zone_id', 'status']);
                $table->index(['status', 'last_seen_at']);
                $table->index('seat_id');
            });
        }

        if (! Schema::hasTable('office_presence_logs')) {
            Schema::create('office_presence_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('zone_id')->nullable()->constrained('office_zones')->nullOnDelete();
                $table->string('status', 24);
                $table->timestamp('started_at');
                $table->timestamp('ended_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'started_at']);
                $table->index(['zone_id', 'started_at']);
            });
        }

        if (! Schema::hasTable('office_events')) {
            Schema::create('office_events', function (Blueprint $table) {
                $table->id();
                $table->string('type', 64);
                $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('zone_id')->nullable()->constrained('office_zones')->nullOnDelete();
                $table->json('payload')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->index(['zone_id', 'created_at']);
                $table->index(['type', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('office_events');
        Schema::dropIfExists('office_presence_logs');
        Schema::dropIfExists('office_presence');
        Schema::dropIfExists('office_seats');
        Schema::dropIfExists('office_zones');
    }
};

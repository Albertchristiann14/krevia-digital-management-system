<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meetings', function (Blueprint $table) {
            if (! Schema::hasColumn('meetings', 'office_zone_id')) {
                $table->foreignId('office_zone_id')->nullable()->after('pic_user_id')->constrained('office_zones')->nullOnDelete();
            }
            if (! Schema::hasColumn('meetings', 'project_id')) {
                $table->foreignId('project_id')->nullable()->after('office_zone_id')->constrained('projects')->nullOnDelete();
            }
            if (! Schema::hasColumn('meetings', 'duration_minutes')) {
                $table->unsignedSmallInteger('duration_minutes')->default(30)->after('scheduled_time');
            }
            if (! Schema::hasColumn('meetings', 'is_live')) {
                $table->boolean('is_live')->default(false)->index()->after('status');
            }
            if (! Schema::hasColumn('meetings', 'is_locked')) {
                $table->boolean('is_locked')->default(false)->after('is_live');
            }
            if (! Schema::hasColumn('meetings', 'live_room_code')) {
                $table->string('live_room_code', 80)->nullable()->after('is_locked');
            }
            if (! Schema::hasColumn('meetings', 'started_at')) {
                $table->timestamp('started_at')->nullable()->after('live_room_code');
            }
            if (! Schema::hasColumn('meetings', 'ended_at')) {
                $table->timestamp('ended_at')->nullable()->after('started_at');
            }
            if (! Schema::hasColumn('meetings', 'started_by')) {
                $table->foreignId('started_by')->nullable()->after('ended_at')->constrained('users')->nullOnDelete();
            }
        });

        if (! Schema::hasTable('office_meeting_participants')) {
            Schema::create('office_meeting_participants', function (Blueprint $table) {
                $table->id();
                $table->foreignId('meeting_id')->constrained('meetings')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->enum('rsvp_status', ['pending', 'accepted', 'maybe', 'declined'])->default('pending');
                $table->boolean('is_in_call')->default(false)->index();
                $table->timestamp('joined_at')->nullable();
                $table->timestamp('left_at')->nullable();
                $table->timestamps();

                $table->unique(['meeting_id', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('office_meeting_participants');

        Schema::table('meetings', function (Blueprint $table) {
            foreach (['started_by', 'ended_at', 'started_at', 'live_room_code', 'is_locked', 'is_live', 'duration_minutes', 'project_id', 'office_zone_id'] as $col) {
                if (Schema::hasColumn('meetings', $col)) {
                    if (in_array($col, ['office_zone_id', 'project_id', 'started_by'], true)) {
                        $table->dropConstrainedForeignId($col);
                    } else {
                        $table->dropColumn($col);
                    }
                }
            }
        });
    }
};

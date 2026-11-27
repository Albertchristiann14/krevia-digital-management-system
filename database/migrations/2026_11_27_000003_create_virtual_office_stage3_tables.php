<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('office_messages')) {
            Schema::create('office_messages', function (Blueprint $table) {
                $table->id();
                $table->string('scope', 16); // zone|dm|room
                $table->foreignId('zone_id')->nullable()->constrained('office_zones')->cascadeOnDelete();
                $table->unsignedBigInteger('room_id')->nullable();
                $table->foreignId('recipient_id')->nullable()->constrained('users')->cascadeOnDelete();
                $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
                $table->text('body');
                $table->json('attachments')->nullable();
                $table->json('reactions')->nullable();
                $table->foreignId('reply_to_id')->nullable()->constrained('office_messages')->nullOnDelete();
                $table->boolean('is_urgent')->default(false);
                $table->timestamp('edited_at')->nullable();
                $table->softDeletes();
                $table->timestamps();

                $table->index(['scope', 'zone_id', 'created_at']);
                $table->index(['scope', 'sender_id', 'recipient_id', 'created_at'], 'office_msg_dm_idx');
                $table->index(['scope', 'room_id', 'created_at']);
            });
        }

        if (! Schema::hasTable('office_message_reads')) {
            Schema::create('office_message_reads', function (Blueprint $table) {
                $table->id();
                $table->foreignId('message_id')->constrained('office_messages')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->timestamp('read_at')->useCurrent();

                $table->unique(['message_id', 'user_id']);
                $table->index('user_id');
            });
        }

        if (! Schema::hasTable('office_knocks')) {
            Schema::create('office_knocks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('from_user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('to_user_id')->constrained('users')->cascadeOnDelete();
                $table->string('message', 200)->nullable();
                $table->string('status', 20)->default('pending'); // pending|accepted|declined|later|expired
                $table->timestamp('expires_at');
                $table->timestamp('responded_at')->nullable();
                $table->timestamps();

                $table->index(['to_user_id', 'status', 'expires_at']);
                $table->index(['from_user_id', 'to_user_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('office_knocks');
        Schema::dropIfExists('office_message_reads');
        Schema::dropIfExists('office_messages');
    }
};

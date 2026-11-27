<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('office_standups')) {
            Schema::create('office_standups', function (Blueprint $table) {
                $table->id();
                $table->date('standup_date')->index();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->text('yesterday');
                $table->text('today');
                $table->text('blockers')->nullable();
                $table->timestamp('submitted_at')->useCurrent();
                $table->timestamps();

                $table->unique(['standup_date', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('office_standups');
    }
};

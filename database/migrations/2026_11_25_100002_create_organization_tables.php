<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name', 120)->unique();
            $table->string('color_hex', 7)->default('#2563EB');
            $table->text('description')->nullable();
            $table->foreignId('lead_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('title', 150);
            $table->foreignId('department_id')->constrained('departments')->cascadeOnDelete();
            $table->string('level', 40)->default('Member'); // Leadership | Specialist | Engineer | Contributor
            $table->text('authority_summary')->nullable();
            $table->timestamps();
        });

        Schema::create('employee_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('employee_code', 30)->unique();
            $table->foreignId('department_id')->constrained('departments');
            $table->foreignId('position_id')->constrained('positions');
            $table->foreignId('primary_supervisor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('secondary_supervisor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('coordination_note')->nullable();
            $table->string('coordination_status', 40)->default('Sesuai arahan'); // Sesuai arahan | Usulan | Perlu Konfirmasi Manajemen
            $table->text('focus_summary')->nullable();
            $table->decimal('weekly_capacity_hours', 5, 2)->nullable();
            $table->string('capacity_status', 40)->default('Perlu Konfirmasi Manajemen');
            $table->string('employment_status', 40)->default('Active'); // Active | Part-Time | Inactive
            $table->date('joined_at')->nullable();
            $table->string('avatar_color', 7)->default('#101D35');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['department_id', 'employment_status']);
        });

        Schema::create('job_descriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('position_id')->unique()->constrained('positions')->cascadeOnDelete();
            $table->text('purpose');
            $table->json('responsibilities');
            $table->json('routine_tasks');
            $table->json('project_tasks');
            $table->json('expected_outputs');
            $table->json('success_indicators');
            $table->json('authority_limits');
            $table->json('coordination_links');
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('raci_activities', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->string('activity_name', 150)->unique();
            $table->text('notes')->nullable();
            $table->string('data_status', 40)->default('Disepakati');
            $table->timestamps();
        });

        Schema::create('raci_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('raci_activity_id')->constrained('raci_activities')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('raci_code', 5); // A, R, A/R, C, I
            $table->timestamps();

            $table->unique(['raci_activity_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('raci_assignments');
        Schema::dropIfExists('raci_activities');
        Schema::dropIfExists('job_descriptions');
        Schema::dropIfExists('employee_profiles');
        Schema::dropIfExists('positions');
        Schema::dropIfExists('departments');
    }
};

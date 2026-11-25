<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200);
            $table->string('industry', 100)->default('Organisasi / Lainnya');
            $table->string('location', 150)->nullable();
            $table->string('phone', 100)->nullable();
            $table->string('email', 200)->nullable();
            $table->string('website', 255)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('industry');
        });

        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->string('name', 150);
            $table->string('role_title', 150)->nullable();
            $table->string('email', 200)->nullable();
            $table->string('phone', 100)->nullable();
            $table->boolean('is_decision_maker')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique(); // L-001..
            $table->unsignedInteger('external_no')->nullable()->unique();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('primary_contact_id')->nullable()->constrained('contacts')->nullOnDelete();
            $table->text('potential_needs')->nullable();
            $table->string('service_line', 80)->default('Belum ditentukan');
            $table->string('source', 120)->nullable();
            $table->string('stage', 50)->default('Lead Identified');
            $table->foreignId('pic_user_id')->constrained('users');
            $table->date('contacted_at')->nullable();
            $table->date('next_follow_up_at')->nullable();
            $table->decimal('estimated_value', 15, 2)->nullable();
            $table->date('discovery_meeting_at')->nullable();
            $table->date('proposal_sent_at')->nullable();
            $table->date('closed_at')->nullable();
            $table->text('lost_reason')->nullable();
            $table->string('data_status', 40)->default('Disepakati');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['stage', 'pic_user_id']);
            $table->index('next_follow_up_at');
        });

        Schema::create('pipeline_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->string('from_stage', 50)->nullable();
            $table->string('to_stage', 50);
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('evidence_note')->nullable();
            $table->timestamp('changed_at')->useCurrent();
        });

        Schema::create('lead_interactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('channel', 40)->default('WhatsApp');
            $table->text('summary');
            $table->text('outcome')->nullable();
            $table->timestamp('occurred_at')->useCurrent();
            $table->timestamps();
        });

        Schema::create('follow_ups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->foreignId('assigned_to')->constrained('users')->cascadeOnDelete();
            $table->date('due_at');
            $table->text('note')->nullable();
            $table->string('status', 30)->default('Pending'); // Pending | Completed | Skipped
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('proposals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->string('code', 40)->unique();
            $table->string('version', 20)->default('v1.0');
            $table->string('title', 255);
            $table->text('scope_summary')->nullable();
            $table->unsignedInteger('estimated_hours')->nullable();
            $table->decimal('total_value', 15, 2)->nullable();
            $table->boolean('is_price_approved')->default(false);
            $table->string('status', 30)->default('Draft'); // Draft | Sent | Under Negotiation | Accepted | Rejected
            $table->date('sent_at')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->foreignId('proposal_id')->nullable()->constrained('proposals')->nullOnDelete();
            $table->string('code', 40)->unique();
            $table->decimal('total_amount', 15, 2)->nullable();
            $table->date('valid_until')->nullable();
            $table->string('status', 30)->default('Draft');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique(); // PRJ-001..
            $table->foreignId('lead_id')->nullable()->unique()->constrained('leads')->nullOnDelete();
            $table->foreignId('company_id')->constrained('companies');
            $table->foreignId('primary_contact_id')->nullable()->constrained('contacts')->nullOnDelete();
            $table->string('name', 255);
            $table->string('service_line', 80); // Website Development & CMS | Custom Software Development
            $table->text('scope_summary')->nullable();
            $table->string('contract_ref', 120)->nullable();
            $table->decimal('contract_value', 15, 2)->nullable();
            $table->string('status', 30)->default('Active'); // Active | On Hold | Completed | Maintenance | Cancelled
            $table->date('start_date')->nullable();
            $table->date('target_end_date')->nullable();
            $table->date('actual_end_date')->nullable();
            $table->foreignId('manager_user_id')->constrained('users');
            $table->foreignId('tech_lead_user_id')->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['service_line', 'status']);
        });

        Schema::create('project_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('project_role', 80);
            $table->timestamps();

            $table->unique(['project_id', 'user_id']);
        });

        Schema::create('project_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->unsignedSmallInteger('stage_order');
            $table->string('name', 120);
            $table->text('purpose')->nullable();
            $table->string('output_label', 200)->nullable();
            $table->text('completion_criteria')->nullable();
            $table->foreignId('pic_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 30)->default('Not Started'); // Not Started | In Progress | Under Review | Completed
            $table->text('completion_evidence_note')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['project_id', 'stage_order']);
        });

        Schema::create('milestones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('title', 200);
            $table->date('due_date')->nullable();
            $table->string('status', 30)->default('Pending');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('code', 30);
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('priority', 20)->default('Tinggi');
            $table->string('status', 30)->default('Draft'); // Draft | Client Approved | Implemented | Verified
            $table->timestamp('client_approved_at')->nullable();
            $table->string('approved_by_client_name', 150)->nullable();
            $table->timestamps();
        });

        Schema::create('acceptance_criteria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('requirement_id')->constrained('requirements')->cascadeOnDelete();
            $table->string('description', 500);
            $table->boolean('is_passed')->default(false);
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });

        Schema::create('qa_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('title', 200);
            $table->string('environment', 40)->default('staging');
            $table->unsignedInteger('critical_bugs')->default(0);
            $table->unsignedInteger('high_bugs')->default(0);
            $table->unsignedInteger('medium_bugs')->default(0);
            $table->json('dod_checklist_json')->nullable();
            $table->string('status', 30)->default('Pending'); // Pending | Passed | Failed
            $table->foreignId('tested_by')->constrained('users');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('tested_at')->useCurrent();
            $table->timestamps();
        });

        Schema::create('uat_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('title', 200);
            $table->string('tester_name', 150);
            $table->string('status', 30)->default('Pending'); // Pending | Approved | Revisions Needed
            $table->text('feedback')->nullable();
            $table->timestamp('signed_off_at')->nullable();
            $table->foreignId('recorded_by')->constrained('users');
            $table->timestamps();
        });

        Schema::create('releases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('version', 40);
            $table->string('environment', 40)->default('production');
            $table->foreignId('deployed_by')->constrained('users');
            $table->timestamp('deployed_at')->useCurrent();
            $table->boolean('has_backup')->default(false);
            $table->boolean('has_rollback_plan')->default(false);
            $table->text('rollback_notes')->nullable();
            $table->text('release_notes')->nullable();
            $table->string('status', 30)->default('Live'); // Planned | Live | Rolled Back
            $table->timestamps();
        });

        Schema::create('handover_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->date('handover_date');
            $table->text('trained_users_summary')->nullable();
            $table->boolean('access_transferred')->default(true);
            $table->boolean('guide_delivered')->default(true);
            $table->string('signed_by_client', 150)->nullable();
            $table->foreignId('recorded_by')->constrained('users');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('maintenance_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('code', 30);
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('priority', 20)->default('Sedang');
            $table->string('status', 30)->default('Open'); // Open | In Progress | Resolved | Closed
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable()->after('annual_roadmap_id')->constrained('projects')->nullOnDelete();
            $table->foreignId('lead_id')->nullable()->after('project_id')->constrained('leads')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('lead_id');
            $table->dropConstrainedForeignId('project_id');
        });

        Schema::dropIfExists('maintenance_tickets');
        Schema::dropIfExists('handover_records');
        Schema::dropIfExists('releases');
        Schema::dropIfExists('uat_records');
        Schema::dropIfExists('qa_reports');
        Schema::dropIfExists('acceptance_criteria');
        Schema::dropIfExists('requirements');
        Schema::dropIfExists('milestones');
        Schema::dropIfExists('project_stages');
        Schema::dropIfExists('project_members');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('quotations');
        Schema::dropIfExists('proposals');
        Schema::dropIfExists('follow_ups');
        Schema::dropIfExists('lead_interactions');
        Schema::dropIfExists('pipeline_histories');
        Schema::dropIfExists('leads');
        Schema::dropIfExists('contacts');
        Schema::dropIfExists('companies');
    }
};

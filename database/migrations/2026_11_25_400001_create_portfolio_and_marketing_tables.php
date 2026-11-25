<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demo_products', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('name');
            $table->string('service_line', 80);
            $table->text('purpose')->nullable();
            $table->text('features_summary')->nullable();
            $table->json('feature_checklist')->nullable();
            $table->json('qa_checklist')->nullable();
            $table->foreignId('pic_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('supporting_team')->nullable();
            $table->date('start_date')->nullable();
            $table->date('target_end_date')->nullable();
            $table->string('status', 40)->default('Not Started')->index();
            $table->string('label_type', 60)->default('contoh internal');
            $table->boolean('client_permission_granted')->default(false);
            $table->boolean('is_conditional')->default(false);
            $table->string('data_status', 60)->default('Disepakati');
            $table->string('staging_url', 500)->nullable();
            $table->string('documentation_url', 500)->nullable();
            $table->foreignId('technical_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('technical_approved_at')->nullable();
            $table->foreignId('commercial_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('commercial_approved_at')->nullable();
            $table->boolean('is_ready_to_present')->default(false)->index();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('demo_criteria_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demo_product_id')->constrained('demo_products')->cascadeOnDelete();
            $table->string('criterion_key', 60);
            $table->string('label');
            $table->unsignedTinyInteger('sort_order');
            $table->boolean('is_met')->default(false);
            $table->text('evidence_note')->nullable();
            $table->foreignId('checked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('checked_at')->nullable();
            $table->timestamps();

            $table->unique(['demo_product_id', 'criterion_key']);
        });

        Schema::create('demo_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demo_product_id')->constrained('demo_products')->cascadeOnDelete();
            $table->string('asset_type', 40);
            $table->string('title');
            $table->string('file_path', 500)->nullable();
            $table->string('external_url', 500)->nullable();
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('content_items', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->foreignId('demo_product_id')->nullable()->constrained('demo_products')->nullOnDelete();
            $table->string('platform', 50)->index();
            $table->string('category', 80)->index();
            $table->text('title_topic');
            $table->text('brief')->nullable();
            $table->text('caption')->nullable();
            $table->text('hashtags')->nullable();
            $table->foreignId('pic_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewer_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('production_date')->nullable()->index();
            $table->date('review_date')->nullable()->index();
            $table->date('publish_date')->nullable()->index();
            $table->timestamp('published_at')->nullable();
            $table->string('published_url', 500)->nullable();
            $table->string('status', 40)->default('Planned')->index();
            $table->boolean('is_reused_reel')->default(false);
            $table->foreignId('source_content_id')->nullable()->constrained('content_items')->nullOnDelete();
            $table->boolean('is_approved')->default(false);
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->string('data_status', 60)->default('Disepakati');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('content_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('content_item_id')->constrained('content_items')->cascadeOnDelete();
            $table->string('asset_type', 40);
            $table->string('title');
            $table->string('file_path', 500)->nullable();
            $table->string('external_url', 500)->nullable();
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('content_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('content_item_id')->constrained('content_items')->cascadeOnDelete();
            $table->foreignId('reviewer_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('decision', 40);
            $table->text('feedback')->nullable();
            $table->timestamp('reviewed_at');
            $table->timestamps();
        });

        Schema::create('content_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('content_item_id')->constrained('content_items')->cascadeOnDelete();
            $table->date('recorded_date');
            $table->unsignedInteger('reach')->default(0);
            $table->unsignedInteger('impressions')->default(0);
            $table->unsignedInteger('likes')->default(0);
            $table->unsignedInteger('comments')->default(0);
            $table->unsignedInteger('shares')->default(0);
            $table->unsignedInteger('saves')->default(0);
            $table->unsignedInteger('clicks')->default(0);
            $table->unsignedInteger('inquiries_generated')->default(0);
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_metrics');
        Schema::dropIfExists('content_approvals');
        Schema::dropIfExists('content_assets');
        Schema::dropIfExists('content_items');
        Schema::dropIfExists('demo_assets');
        Schema::dropIfExists('demo_criteria_checks');
        Schema::dropIfExists('demo_products');
    }
};

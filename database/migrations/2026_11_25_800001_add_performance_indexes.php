<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->index('created_at', 'audit_logs_created_at_idx');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->index(['notifiable_type', 'notifiable_id', 'read_at'], 'notifications_unread_idx');
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->index('project_id', 'tasks_project_id_idx');
            $table->index('lead_id', 'tasks_lead_id_idx');
        });

        Schema::table('content_items', function (Blueprint $table) {
            $table->index(['publish_date', 'status'], 'content_items_publish_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex('audit_logs_created_at_idx');
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_unread_idx');
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex('tasks_project_id_idx');
            $table->dropIndex('tasks_lead_id_idx');
        });

        Schema::table('content_items', function (Blueprint $table) {
            $table->dropIndex('content_items_publish_status_idx');
        });
    }
};

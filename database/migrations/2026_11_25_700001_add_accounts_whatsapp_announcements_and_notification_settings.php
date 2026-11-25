<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('must_change_password')->default(false)->after('is_active');
            $table->timestamp('password_updated_at')->nullable()->after('must_change_password');
        });

        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->string('whatsapp_number', 30)->nullable()->after('employment_status');
            $table->string('notification_email', 180)->nullable()->after('whatsapp_number');
            $table->boolean('notify_via_email')->default(true)->after('notification_email');
            $table->boolean('notify_via_whatsapp')->default(true)->after('notify_via_email');
        });

        Schema::create('notification_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('mail_enabled')->default(false);
            $table->string('smtp_host', 120)->default('smtp.gmail.com');
            $table->unsignedSmallInteger('smtp_port')->default(587);
            $table->string('smtp_encryption', 10)->default('tls');
            $table->string('smtp_username', 180)->nullable();
            $table->text('smtp_password')->nullable();
            $table->string('mail_from_address', 180)->nullable();
            $table->string('mail_from_name', 120)->default('Krevia Digital Management System');

            $table->boolean('whatsapp_enabled')->default(false);
            $table->string('whatsapp_driver', 30)->default('log'); // log | fonnte | meta_cloud | webhook
            $table->string('whatsapp_api_url', 500)->nullable();
            $table->text('whatsapp_api_token')->nullable();
            $table->string('whatsapp_sender_id', 120)->nullable();
            $table->string('whatsapp_default_group', 120)->nullable();
            $table->string('gmail_relay_address', 180)->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('title');
            $table->text('body');
            $table->string('priority', 30)->default('Normal'); // Normal | Penting | Mendesak
            $table->string('audience_type', 30)->default('all'); // all | department | selected
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->json('recipient_user_ids')->nullable();
            $table->boolean('send_email')->default(true);
            $table->boolean('send_whatsapp')->default(true);
            $table->boolean('send_gmail_relay')->default(false);
            $table->foreignId('published_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('published_at')->nullable();
            $table->json('delivery_summary')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('notification_delivery_logs', function (Blueprint $table) {
            $table->id();
            $table->string('channel', 30)->index(); // mail | whatsapp | gmail_relay
            $table->foreignId('recipient_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('recipient_target', 200);
            $table->string('subject_or_type', 160);
            $table->text('payload_preview')->nullable();
            $table->string('status', 30)->index(); // sent | logged | skipped | failed
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_delivery_logs');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('notification_settings');

        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->dropColumn(['whatsapp_number', 'notification_email', 'notify_via_email', 'notify_via_whatsapp']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['must_change_password', 'password_updated_at']);
        });
    }
};

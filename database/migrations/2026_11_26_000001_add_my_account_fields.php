<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar_path', 500)->nullable()->after('email');
            $table->string('last_login_ip', 45)->nullable()->after('last_login_at');
            $table->json('notification_preferences')->nullable()->after('last_login_ip');
            $table->json('preferences')->nullable()->after('notification_preferences');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'avatar_path',
                'last_login_ip',
                'notification_preferences',
                'preferences',
            ]);
        });
    }
};

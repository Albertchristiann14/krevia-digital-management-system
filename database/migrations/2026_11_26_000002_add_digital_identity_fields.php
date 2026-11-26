<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'public_visibility')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->json('public_visibility')->nullable()->after('preferences');
            });
        }

        if (! Schema::hasTable('digital_identities')) {
            Schema::create('digital_identities', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('token_hash', 64)->unique();
                $table->text('token_encrypted')->nullable();
                $table->string('status', 20)->default('active')->index();
                $table->timestamp('regenerated_at')->nullable();
                $table->timestamp('revoked_at')->nullable();
                $table->timestamp('last_verified_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('digital_identities');

        if (Schema::hasColumn('users', 'public_visibility')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn('public_visibility');
            });
        }
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('office_visitors')) {
            Schema::create('office_visitors', function (Blueprint $table) {
                $table->id();
                $table->string('name', 120);
                $table->string('company_name', 160)->nullable();
                $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
                $table->foreignId('contact_id')->nullable()->constrained('contacts')->nullOnDelete();
                $table->string('purpose', 255);
                $table->foreignId('host_user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('zone_id')->nullable()->constrained('office_zones')->nullOnDelete();
                $table->enum('status', ['waiting', 'admitted', 'delayed', 'checked_out', 'expired'])->default('waiting')->index();
                $table->string('host_note', 255)->nullable();
                $table->timestamp('checked_in_at')->useCurrent();
                $table->timestamp('admitted_at')->nullable();
                $table->timestamp('checked_out_at')->nullable();
                $table->timestamp('expires_at')->nullable()->index();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('office_visitors');
    }
};

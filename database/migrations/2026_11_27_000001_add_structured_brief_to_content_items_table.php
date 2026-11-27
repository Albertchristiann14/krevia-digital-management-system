<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('content_items', function (Blueprint $table) {
            if (! Schema::hasColumn('content_items', 'content_format')) {
                $table->string('content_format', 40)->nullable()->after('category');
            }
            if (! Schema::hasColumn('content_items', 'structured_brief')) {
                $table->json('structured_brief')->nullable()->after('brief');
            }
        });
    }

    public function down(): void
    {
        Schema::table('content_items', function (Blueprint $table) {
            if (Schema::hasColumn('content_items', 'structured_brief')) {
                $table->dropColumn('structured_brief');
            }
            if (Schema::hasColumn('content_items', 'content_format')) {
                $table->dropColumn('content_format');
            }
        });
    }
};

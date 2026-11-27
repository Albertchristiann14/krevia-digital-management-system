<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('leads', 'kanban_order')) {
            Schema::table('leads', function (Blueprint $table): void {
                $table->unsignedInteger('kanban_order')->default(0)->after('stage')->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('leads', 'kanban_order')) {
            Schema::table('leads', function (Blueprint $table): void {
                $table->dropColumn('kanban_order');
            });
        }
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('tasks', 'kanban_order')) {
            Schema::table('tasks', function (Blueprint $table): void {
                $table->unsignedInteger('kanban_order')->default(0)->after('progress_pct')->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('tasks', 'kanban_order')) {
            Schema::table('tasks', function (Blueprint $table): void {
                $table->dropColumn('kanban_order');
            });
        }
    }
};

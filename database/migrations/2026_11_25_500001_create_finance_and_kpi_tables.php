<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_settings', function (Blueprint $table) {
            $table->id();
            $table->decimal('opening_cash_balance', 15, 2)->nullable();
            $table->date('opening_cash_date')->default('2026-12-01');
            $table->string('currency', 10)->default('IDR');
            $table->string('data_status', 60)->default('Perlu Konfirmasi Manajemen');
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('fiscal_year')->default(2027);
            $table->string('category', 100);
            $table->foreignId('pic_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('assumptions')->nullable();
            $table->decimal('target_amount', 15, 2)->nullable();
            $table->string('data_status', 60)->default('Perlu Konfirmasi Manajemen');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['fiscal_year', 'category']);
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_no', 40)->unique();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('description');
            $table->date('issue_date');
            $table->date('due_date')->index();
            $table->decimal('amount', 15, 2);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->string('status', 30)->default('Draft')->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('invoice_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->decimal('amount', 15, 2);
            $table->date('paid_at');
            $table->string('payment_method', 60)->default('Bank Transfer');
            $table->string('reference_no', 120)->nullable();
            $table->string('receipt_path', 500)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->date('transaction_date')->index();
            $table->string('period_month', 7)->index();
            $table->string('type', 40)->index(); // Pendapatan diterima | Pengeluaran
            $table->string('description');
            $table->string('category', 100)->index();
            $table->decimal('amount', 15, 2);
            $table->foreignId('budget_id')->nullable()->constrained('budgets')->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('pic_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reference', 200)->nullable();
            $table->string('evidence_path', 500)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('kpi_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(1);
            $table->string('name');
            $table->text('definition')->nullable();
            $table->string('target_label');
            $table->string('evaluation_period', 40)->default('Bulanan');
            $table->decimal('weight', 5, 4); // sum per user = 1.0000
            $table->string('data_status', 60)->default('Disepakati');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('kpi_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('period_type', 30)->default('Bulanan'); // Bulanan | Kuartalan
            $table->string('period_label', 40); // e.g. 2027-01 or 2027-Q1
            $table->decimal('total_weight', 5, 4)->default(1.0000);
            $table->decimal('total_score', 6, 2)->default(0);
            $table->string('rating_band', 40)->default('Perlu perbaikan');
            $table->string('status', 30)->default('Draft'); // Draft | Approved
            $table->foreignId('evaluated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'period_label']);
        });

        Schema::create('kpi_evaluation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kpi_evaluation_id')->constrained('kpi_evaluations')->cascadeOnDelete();
            $table->foreignId('kpi_definition_id')->constrained('kpi_definitions')->cascadeOnDelete();
            $table->string('actual_value')->nullable();
            $table->decimal('score', 5, 2)->default(0); // 0..100
            $table->decimal('weight_snapshot', 5, 4);
            $table->decimal('weighted_score', 6, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['kpi_evaluation_id', 'kpi_definition_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kpi_evaluation_items');
        Schema::dropIfExists('kpi_evaluations');
        Schema::dropIfExists('kpi_definitions');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('invoice_payments');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('budgets');
        Schema::dropIfExists('financial_settings');
    }
};

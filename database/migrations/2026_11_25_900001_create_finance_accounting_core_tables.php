<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->string('auditable_uuid', 36)->nullable()->after('auditable_id')->index();
        });

        Schema::create('finance_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 20)->unique();
            $table->string('name', 150);
            $table->string('type', 30)->index(); // Asset, Liability, Equity, Revenue, Expense
            $table->string('normal_balance', 10); // Debit, Credit
            $table->uuid('parent_id')->nullable()->index();
            $table->text('description')->nullable();
            $table->boolean('is_posting')->default(true);
            $table->boolean('is_active')->default(true)->index();
            $table->boolean('is_system')->default(false);
            $table->timestamps();
        });

        Schema::table('finance_accounts', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('finance_accounts')->nullOnDelete();
        });

        Schema::create('finance_fiscal_years', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 40)->unique();
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status', 20)->default('Open')->index(); // Open, Closed
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('finance_periods', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('fiscal_year_id')->constrained('finance_fiscal_years')->cascadeOnDelete();
            $table->string('code', 10)->unique(); // e.g. 2026-12
            $table->string('name', 40);
            $table->date('start_date')->index();
            $table->date('end_date')->index();
            $table->string('status', 20)->default('Open')->index(); // Open, Closed, Locked
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('reopened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reopened_at')->nullable();
            $table->text('reopen_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('finance_journals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('journal_no', 40)->unique();
            $table->foreignUuid('period_id')->constrained('finance_periods')->restrictOnDelete();
            $table->date('journal_date')->index();
            $table->string('journal_type', 30)->default('General')->index(); // General, Adjusting, Reversal, Opening, System
            $table->string('source_type', 120)->nullable();
            $table->string('source_id', 64)->nullable();
            $table->string('description', 500);
            $table->string('currency', 10)->default('IDR');
            $table->decimal('exchange_rate', 15, 6)->default(1);
            $table->decimal('total_debit', 20, 2)->default(0);
            $table->decimal('total_credit', 20, 2)->default(0);
            $table->string('status', 30)->default('Draft')->index(); // Draft, Pending Approval, Approved, Posted, Reversed, Cancelled
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('posted_at')->nullable();
            $table->uuid('reversed_by_journal_id')->nullable();
            $table->timestamps();

            $table->index(['source_type', 'source_id']);
        });

        Schema::create('finance_journal_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('journal_id')->constrained('finance_journals')->cascadeOnDelete();
            $table->unsignedSmallInteger('line_no');
            $table->foreignUuid('account_id')->constrained('finance_accounts')->restrictOnDelete();
            $table->string('description', 300)->nullable();
            $table->decimal('debit', 20, 2)->default(0);
            $table->decimal('credit', 20, 2)->default(0);
            $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['account_id', 'created_at']);
            $table->index('project_id');
        });

        Schema::create('finance_journal_reversals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('original_journal_id')->constrained('finance_journals')->restrictOnDelete();
            $table->foreignUuid('reversal_journal_id')->constrained('finance_journals')->restrictOnDelete();
            $table->text('reason');
            $table->foreignId('reversed_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('reversed_at');
            $table->timestamps();

            $table->unique('original_journal_id');
        });

        Schema::create('finance_opening_balances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('fiscal_year_id')->constrained('finance_fiscal_years')->cascadeOnDelete();
            $table->foreignUuid('account_id')->constrained('finance_accounts')->restrictOnDelete();
            $table->decimal('debit_balance', 20, 2)->default(0);
            $table->decimal('credit_balance', 20, 2)->default(0);
            $table->foreignUuid('journal_id')->nullable()->constrained('finance_journals')->nullOnDelete();
            $table->timestamps();

            $table->unique(['fiscal_year_id', 'account_id']);
        });

        Schema::create('finance_account_balances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('period_id')->constrained('finance_periods')->cascadeOnDelete();
            $table->foreignUuid('account_id')->constrained('finance_accounts')->cascadeOnDelete();
            $table->decimal('opening_debit', 20, 2)->default(0);
            $table->decimal('opening_credit', 20, 2)->default(0);
            $table->decimal('period_debit', 20, 2)->default(0);
            $table->decimal('period_credit', 20, 2)->default(0);
            $table->decimal('closing_debit', 20, 2)->default(0);
            $table->decimal('closing_credit', 20, 2)->default(0);
            $table->timestamps();

            $table->unique(['period_id', 'account_id']);
        });

        Schema::create('finance_taxes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 30)->unique();
            $table->string('name', 120);
            $table->string('category', 30); // Output, Input, Withholding
            $table->decimal('rate', 8, 4); // e.g. 11.0000 for 11%
            $table->boolean('is_inclusive')->default(false);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->foreignUuid('payable_account_id')->nullable()->constrained('finance_accounts')->nullOnDelete();
            $table->foreignUuid('receivable_account_id')->nullable()->constrained('finance_accounts')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('finance_configurations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('base_currency', 10)->default('IDR');
            $table->string('invoice_prefix', 20)->default('INV/KRV');
            $table->string('journal_prefix', 20)->default('JRN/KRV');
            $table->string('expense_prefix', 20)->default('EXP/KRV');
            $table->string('bill_prefix', 20)->default('BILL/KRV');
            $table->foreignUuid('default_cash_account_id')->nullable()->constrained('finance_accounts', 'id', 'fin_cfg_cash_fk')->nullOnDelete();
            $table->foreignUuid('default_bank_account_id')->nullable()->constrained('finance_accounts', 'id', 'fin_cfg_bank_fk')->nullOnDelete();
            $table->foreignUuid('default_ar_account_id')->nullable()->constrained('finance_accounts', 'id', 'fin_cfg_ar_fk')->nullOnDelete();
            $table->foreignUuid('default_ap_account_id')->nullable()->constrained('finance_accounts', 'id', 'fin_cfg_ap_fk')->nullOnDelete();
            $table->foreignUuid('default_unearned_revenue_account_id')->nullable()->constrained('finance_accounts', 'id', 'fin_cfg_unearned_fk')->nullOnDelete();
            $table->foreignUuid('default_revenue_account_id')->nullable()->constrained('finance_accounts', 'id', 'fin_cfg_rev_fk')->nullOnDelete();
            $table->foreignUuid('default_expense_account_id')->nullable()->constrained('finance_accounts', 'id', 'fin_cfg_exp_fk')->nullOnDelete();
            $table->foreignUuid('default_compensation_payable_account_id')->nullable()->constrained('finance_accounts', 'id', 'fin_cfg_comp_pay_fk')->nullOnDelete();
            $table->foreignUuid('default_retained_earnings_account_id')->nullable()->constrained('finance_accounts', 'id', 'fin_cfg_ret_earn_fk')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_configurations');
        Schema::dropIfExists('finance_taxes');
        Schema::dropIfExists('finance_account_balances');
        Schema::dropIfExists('finance_opening_balances');
        Schema::dropIfExists('finance_journal_reversals');
        Schema::dropIfExists('finance_journal_lines');
        Schema::dropIfExists('finance_journals');
        Schema::dropIfExists('finance_periods');
        Schema::dropIfExists('finance_fiscal_years');
        Schema::dropIfExists('finance_accounts');

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropColumn('auditable_uuid');
        });
    }
};

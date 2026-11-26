<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_cash_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 30)->unique();
            $table->string('name', 120);
            $table->string('account_type', 20)->default('Bank'); // Cash, Bank
            $table->string('bank_name', 120)->nullable();
            $table->string('account_number', 60)->nullable();
            $table->foreignUuid('gl_account_id')->constrained('finance_accounts')->restrictOnDelete();
            $table->string('currency', 10)->default('IDR');
            $table->decimal('opening_balance', 20, 2)->default(0);
            $table->decimal('current_balance', 20, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('finance_bank_transfers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('transfer_no', 40)->unique();
            $table->foreignUuid('from_cash_account_id')->constrained('finance_cash_accounts', 'id', 'fin_trf_from_cash_fk')->restrictOnDelete();
            $table->foreignUuid('to_cash_account_id')->constrained('finance_cash_accounts', 'id', 'fin_trf_to_cash_fk')->restrictOnDelete();
            $table->date('transfer_date')->index();
            $table->decimal('amount', 20, 2);
            $table->string('reference_no', 100)->nullable();
            $table->text('notes')->nullable();
            $table->foreignUuid('journal_id')->nullable()->constrained('finance_journals')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('finance_bank_statements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cash_account_id')->constrained('finance_cash_accounts')->cascadeOnDelete();
            $table->date('statement_date');
            $table->string('reference_no', 80)->nullable();
            $table->decimal('opening_balance', 20, 2)->default(0);
            $table->decimal('closing_balance', 20, 2)->default(0);
            $table->string('status', 30)->default('Draft'); // Draft, Reconciling, Reconciled
            $table->foreignId('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('finance_bank_statement_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('statement_id')->constrained('finance_bank_statements')->cascadeOnDelete();
            $table->date('transaction_date');
            $table->string('description', 300);
            $table->string('reference', 120)->nullable();
            $table->decimal('debit', 20, 2)->default(0);
            $table->decimal('credit', 20, 2)->default(0);
            $table->foreignUuid('matched_journal_line_id')->nullable()->constrained('finance_journal_lines', 'id', 'fin_bsl_jline_fk')->nullOnDelete();
            $table->boolean('is_reconciled')->default(false);
            $table->timestamps();
        });

        Schema::create('finance_invoice_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->string('description', 300);
            $table->decimal('quantity', 12, 2)->default(1);
            $table->decimal('unit_price', 20, 2);
            $table->decimal('discount_amount', 20, 2)->default(0);
            $table->foreignUuid('tax_id')->nullable()->constrained('finance_taxes')->nullOnDelete();
            $table->decimal('tax_amount', 20, 2)->default(0);
            $table->decimal('line_total', 20, 2);
            $table->foreignUuid('revenue_account_id')->nullable()->constrained('finance_accounts')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('finance_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('payment_no', 40)->unique();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignUuid('cash_account_id')->constrained('finance_cash_accounts')->restrictOnDelete();
            $table->date('payment_date')->index();
            $table->decimal('amount_received', 20, 2);
            $table->decimal('unallocated_amount', 20, 2)->default(0);
            $table->string('payment_method', 60)->default('Bank Transfer');
            $table->string('reference_no', 120)->nullable()->unique();
            $table->string('idempotency_key', 100)->nullable()->unique();
            $table->string('receipt_path', 500)->nullable();
            $table->text('notes')->nullable();
            $table->foreignUuid('journal_id')->nullable()->constrained('finance_journals')->nullOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('finance_payment_allocations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('payment_id')->constrained('finance_payments')->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained('invoices')->restrictOnDelete();
            $table->decimal('allocated_amount', 20, 2);
            $table->timestamps();

            $table->unique(['payment_id', 'invoice_id']);
        });

        Schema::create('finance_credit_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('credit_note_no', 40)->unique();
            $table->foreignId('invoice_id')->constrained('invoices')->restrictOnDelete();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->date('issue_date');
            $table->decimal('amount', 20, 2);
            $table->string('reason', 500);
            $table->string('status', 30)->default('Draft'); // Draft, Pending Approval, Approved, Applied, Void
            $table->foreignUuid('journal_id')->nullable()->constrained('finance_journals')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('finance_subscription_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 30)->unique();
            $table->string('name', 150);
            $table->string('service_line', 80)->default('Digital Products & Recurring Services');
            $table->string('billing_cycle', 20)->default('Monthly'); // Monthly, Annual
            $table->decimal('price', 20, 2);
            $table->foreignUuid('revenue_account_id')->nullable()->constrained('finance_accounts')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('finance_subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('subscription_no', 40)->unique();
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignUuid('plan_id')->constrained('finance_subscription_plans')->restrictOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->date('start_date');
            $table->date('next_billing_date')->index();
            $table->date('end_date')->nullable();
            $table->string('status', 30)->default('Active')->index(); // Trial, Active, Past Due, Suspended, Cancelled, Expired
            $table->boolean('auto_renew')->default(true);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('finance_subscription_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('subscription_id')->constrained('finance_subscriptions')->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained('invoices')->restrictOnDelete();
            $table->date('billing_period_start');
            $table->date('billing_period_end');
            $table->timestamps();

            $table->unique(['subscription_id', 'billing_period_start', 'billing_period_end'], 'fin_sub_inv_period_unique');
        });

        Schema::create('finance_revenue_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('source_type', 40); // Invoice, Subscription
            $table->string('source_id', 64);
            $table->foreignId('company_id')->constrained('companies')->restrictOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->decimal('total_amount', 20, 2);
            $table->decimal('recognized_amount', 20, 2)->default(0);
            $table->date('start_date');
            $table->date('end_date');
            $table->unsignedSmallInteger('periods_count');
            $table->string('status', 30)->default('Active'); // Active, Completed, Cancelled
            $table->timestamps();

            $table->index(['source_type', 'source_id']);
        });

        Schema::create('finance_revenue_recognition_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('schedule_id')->constrained('finance_revenue_schedules')->cascadeOnDelete();
            $table->string('period_month', 7)->index();
            $table->date('recognition_date');
            $table->decimal('amount', 20, 2);
            $table->string('status', 20)->default('Scheduled')->index(); // Scheduled, Recognized
            $table->foreignUuid('journal_id')->nullable()->constrained('finance_journals')->nullOnDelete();
            $table->timestamps();

            $table->unique(['schedule_id', 'period_month'], 'fin_rev_rec_schedule_month_unique');
        });

        Schema::create('finance_vendors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 30)->unique();
            $table->string('name', 180);
            $table->string('email', 150)->nullable();
            $table->string('phone', 40)->nullable();
            $table->text('address')->nullable();
            $table->string('tax_id', 60)->nullable();
            $table->string('bank_name', 100)->nullable();
            $table->string('bank_account_no', 60)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('finance_expense_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('expense_no', 40)->unique();
            $table->foreignId('requester_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->date('expense_date')->index();
            $table->string('category', 100)->index();
            $table->string('description', 500);
            $table->decimal('amount', 20, 2);
            $table->foreignUuid('tax_id')->nullable()->constrained('finance_taxes')->nullOnDelete();
            $table->decimal('tax_amount', 20, 2)->default(0);
            $table->decimal('total_amount', 20, 2);
            $table->string('payment_method', 60)->default('Bank Transfer');
            $table->string('receipt_path', 500)->nullable();
            $table->string('approval_status', 30)->default('Pending Approval')->index();
            $table->string('payment_status', 30)->default('Unpaid')->index();
            $table->foreignUuid('expense_account_id')->nullable()->constrained('finance_accounts')->nullOnDelete();
            $table->foreignUuid('cash_account_id')->nullable()->constrained('finance_cash_accounts')->nullOnDelete();
            $table->foreignUuid('journal_id')->nullable()->constrained('finance_journals')->nullOnDelete();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });

        Schema::create('finance_vendor_bills', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('bill_no', 40)->unique();
            $table->foreignUuid('vendor_id')->constrained('finance_vendors')->restrictOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->date('bill_date');
            $table->date('due_date')->index();
            $table->decimal('subtotal', 20, 2);
            $table->decimal('tax_amount', 20, 2)->default(0);
            $table->decimal('total_amount', 20, 2);
            $table->decimal('paid_amount', 20, 2)->default(0);
            $table->string('status', 30)->default('Pending Approval')->index();
            $table->foreignUuid('expense_account_id')->nullable()->constrained('finance_accounts')->nullOnDelete();
            $table->foreignUuid('journal_id')->nullable()->constrained('finance_journals')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('finance_vendor_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('payment_no', 40)->unique();
            $table->foreignUuid('vendor_bill_id')->constrained('finance_vendor_bills')->restrictOnDelete();
            $table->foreignUuid('cash_account_id')->constrained('finance_cash_accounts')->restrictOnDelete();
            $table->date('payment_date');
            $table->decimal('amount', 20, 2);
            $table->string('payment_method', 60)->default('Bank Transfer');
            $table->string('reference_no', 120)->nullable();
            $table->string('approval_status', 30)->default('Pending Approval')->index();
            $table->foreignUuid('journal_id')->nullable()->constrained('finance_journals')->nullOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('finance_reimbursements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reimbursement_no', 40)->unique();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->date('expense_date');
            $table->string('category', 100);
            $table->string('description', 500);
            $table->decimal('amount', 20, 2);
            $table->string('receipt_path', 500)->nullable();
            $table->string('approval_status', 30)->default('Pending Approval')->index();
            $table->string('payment_status', 30)->default('Unpaid')->index();
            $table->foreignUuid('expense_account_id')->nullable()->constrained('finance_accounts')->nullOnDelete();
            $table->foreignUuid('cash_account_id')->nullable()->constrained('finance_cash_accounts')->nullOnDelete();
            $table->foreignUuid('journal_id')->nullable()->constrained('finance_journals')->nullOnDelete();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });

        Schema::create('finance_project_budgets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('project_id')->unique()->constrained('projects')->cascadeOnDelete();
            $table->decimal('contract_value', 20, 2)->default(0);
            $table->decimal('approved_budget', 20, 2)->default(0);
            $table->decimal('committed_amount', 20, 2)->default(0);
            $table->decimal('allocated_overhead', 20, 2)->default(0);
            $table->string('approval_status', 30)->default('Draft');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('finance_project_costs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('cost_type', 40); // Direct Labor, Infrastructure, Subcontractor, Overhead, Other
            $table->string('source_type', 60);
            $table->string('source_id', 64);
            $table->string('description', 300);
            $table->date('cost_date');
            $table->decimal('amount', 20, 2);
            $table->boolean('is_committed')->default(false);
            $table->foreignUuid('journal_id')->nullable()->constrained('finance_journals')->nullOnDelete();
            $table->timestamps();

            $table->unique(['project_id', 'source_type', 'source_id'], 'fin_proj_cost_source_unique');
        });

        Schema::create('finance_compensations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('compensation_no', 40)->unique();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->string('compensation_type', 60);
            $table->decimal('amount', 20, 2);
            $table->string('description', 500);
            $table->text('calculation_basis')->nullable();
            $table->string('supporting_document_path', 500)->nullable();
            $table->string('approval_status', 30)->default('Pending Approval')->index();
            $table->string('payment_status', 30)->default('Unpaid')->index();
            $table->date('payment_date')->nullable();
            $table->string('payment_reference', 120)->nullable();
            $table->foreignUuid('cash_account_id')->nullable()->constrained('finance_cash_accounts')->nullOnDelete();
            $table->foreignUuid('journal_id')->nullable()->constrained('finance_journals')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['user_id', 'payment_status']);
        });

        Schema::create('finance_approval_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('request_no', 40)->unique();
            $table->string('request_type', 60)->index();
            $table->string('approvable_type', 120);
            $table->string('approvable_id', 64);
            $table->foreignId('requester_id')->constrained('users')->restrictOnDelete();
            $table->decimal('amount', 20, 2)->default(0);
            $table->string('summary', 500);
            $table->string('status', 30)->default('Pending Approval')->index();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->text('decision_reason')->nullable();
            $table->timestamp('submitted_at');
            $table->timestamps();

            $table->index(['approvable_type', 'approvable_id'], 'fin_appr_entity_idx');
        });

        Schema::create('finance_approval_actions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('approval_request_id')->constrained('finance_approval_requests')->cascadeOnDelete();
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->string('action', 30); // Submitted, Approved, Rejected, Cancelled
            $table->text('reason')->nullable();
            $table->timestamp('acted_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_approval_actions');
        Schema::dropIfExists('finance_approval_requests');
        Schema::dropIfExists('finance_compensations');
        Schema::dropIfExists('finance_project_costs');
        Schema::dropIfExists('finance_project_budgets');
        Schema::dropIfExists('finance_reimbursements');
        Schema::dropIfExists('finance_vendor_payments');
        Schema::dropIfExists('finance_vendor_bills');
        Schema::dropIfExists('finance_expense_requests');
        Schema::dropIfExists('finance_vendors');
        Schema::dropIfExists('finance_revenue_recognition_entries');
        Schema::dropIfExists('finance_revenue_schedules');
        Schema::dropIfExists('finance_subscription_invoices');
        Schema::dropIfExists('finance_subscriptions');
        Schema::dropIfExists('finance_subscription_plans');
        Schema::dropIfExists('finance_credit_notes');
        Schema::dropIfExists('finance_payment_allocations');
        Schema::dropIfExists('finance_payments');
        Schema::dropIfExists('finance_invoice_items');
        Schema::dropIfExists('finance_bank_statement_lines');
        Schema::dropIfExists('finance_bank_statements');
        Schema::dropIfExists('finance_bank_transfers');
        Schema::dropIfExists('finance_cash_accounts');
    }
};

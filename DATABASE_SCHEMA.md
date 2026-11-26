# Krevia DMS — MySQL 8.4 Database Schema Architecture

**Engine:** MySQL 8.4 Community Server (InnoDB, `utf8mb4_unicode_ci`, `sql_mode=STRICT_TRANS_TABLES`)  
**Total Migration Files:** 16  
**Total Tables:** 100+ relational tables across 8 functional domains.

---

## 1. Domain Breakdown

1. **System, Auth & RBAC (13 tables):**
   - `users` (with `is_active`, `must_change_password`, `password_updated_at`, `last_login_at`, `deleted_at`), `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `permissions`, `roles`, `model_has_permissions`, `model_has_roles`, `role_has_permissions`.
2. **Organization & Governance (18 tables):**
   - `departments`, `positions`, `employee_profiles` (with `whatsapp_number`, `notification_email`, channel flags), `job_descriptions`, `raci_activities`, `raci_assignments`, `audit_logs` (with `auditable_id` + `auditable_uuid`), `risks`, `risk_reviews`, `meeting_forums`, `meetings`, `meeting_minutes`, `decisions`, `action_items`, `weekly_reports`, `quarterly_reviews`, `documents`, `import_batches`, `notification_settings`, `announcements`, `notification_delivery_logs`.
3. **Workplan & Task Management (9 tables):**
   - `annual_roadmaps`, `tasks` (indexed on `pic_user_id + status`, `deadline + status`, `annual_roadmap_id`, `project_id`, `lead_id`), `monthly_workplans`, `subtasks`, `task_dependencies`, `task_comments`, `task_evidences`, `task_status_histories`, `notifications` (composite `notifications_unread_idx`).
4. **CRM & Project Delivery (19 tables):**
   - `companies`, `contacts`, `leads`, `pipeline_histories`, `lead_interactions`, `follow_ups`, `proposals`, `quotations`, `projects`, `project_members`, `project_stages`, `milestones`, `requirements`, `acceptance_criteria`, `qa_reports`, `uat_records`, `releases`, `handover_records`, `maintenance_tickets`.
5. **Portfolio & Marketing (7 tables):**
   - `demo_products`, `demo_criteria_checks`, `demo_assets`, `content_items`, `content_assets`, `content_approvals`, `content_metrics`.
6. **KPI & Performance (3 tables):**
   - `kpi_definitions`, `kpi_evaluations`, `kpi_evaluation_items`.
7. **Legacy / Operational Finance Tracker (5 tables):**
   - `financial_settings`, `budgets`, `invoices`, `invoice_payments`, `transactions`.
8. **Double-Entry Accounting & Enterprise Finance Suite (33 tables, UUID PKs):**
   - **Core Accounting:** `finance_accounts`, `finance_fiscal_years`, `finance_periods`, `finance_journals`, `finance_journal_lines`, `finance_journal_reversals`, `finance_opening_balances`, `finance_account_balances`, `finance_taxes`, `finance_configurations`.
   - **Cash & Bank:** `finance_cash_accounts`, `finance_bank_transfers`, `finance_bank_statements`, `finance_bank_statement_lines`.
   - **Sales, AR & Subscriptions:** `finance_invoice_items`, `finance_payments`, `finance_payment_allocations`, `finance_credit_notes`, `finance_subscription_plans`, `finance_subscriptions`, `finance_subscription_invoices`, `finance_revenue_schedules`, `finance_revenue_recognition_entries`.
   - **Expenses, AP, Projects & Compensation:** `finance_vendors`, `finance_expense_requests`, `finance_vendor_bills`, `finance_vendor_payments`, `finance_reimbursements`, `finance_project_budgets`, `finance_project_costs`, `finance_compensations`, `finance_approval_requests`, `finance_approval_actions`.

---

## 2. Key Integrity & Indexing Guarantees

- **Referential Integrity:** Every cross-table relation enforces foreign keys (`RESTRICT` on financial master data like `invoices.company_id`, `finance_journal_lines.account_id`; `CASCADE` on dependent child lines; `SET NULL` on optional actor/reviewer references).
- **Idempotency & Anti-Double-Counting:**
  - `finance_payments.idempotency_key` (`UNIQUE`) & `reference_no` (`UNIQUE`).
  - `finance_subscription_invoices(subscription_id, billing_period_start, billing_period_end)` (`UNIQUE`).
  - `finance_revenue_recognition_entries(schedule_id, period_month)` (`UNIQUE`).
  - `finance_project_costs(project_id, source_type, source_id)` (`UNIQUE`).
- **Monetary Precision:** `DECIMAL(20,2)` for all new accounting & ledger amounts, `DECIMAL(15,2)` for legacy finance tables.

# Krevia Digital Management System (KDMS) — Technical Architecture

## 1. Architecture Overview
KDMS is a modular monolithic internal business platform built on:
- **Backend:** Laravel 13, PHP 8.3+, Eloquent ORM, Spatie Laravel Permission, PhpSpreadsheet (`phpoffice/phpspreadsheet`).
- **Frontend:** React 19, TypeScript, Inertia.js, Tailwind CSS, Lucide Icons, Recharts, FullCalendar v6.
- **Database & Cache:** MySQL 8 (`kdms` / `kdms_test`) + Redis (Predis).

`Model::preventLazyLoading(! app()->isProduction())` is enabled in `AppServiceProvider` to guarantee eager loading and prevent N+1 query regressions.

## 2. Domain Modules (`app/Domain/`)
| Domain | Key Models | Core Services / Invariants |
|---|---|---|
| **Organization** | `Department`, `Position`, `EmployeeProfile`, `JobDescription`, `RaciActivity`, `RaciAssignment` | `RaciInvariantValidator`: enforces 1 Accountable (`A`) and >=1 Responsible (`R`) per activity (`17` activities across `7` team members). |
| **Workplan** | `AnnualRoadmap`, `MonthlyWorkplan`, `Task`, `Subtask`, `TaskDependency`, `TaskEvidence`, `TaskComment` | `TaskTransitionService`: blocks `Completed` without attached evidence; reviewer approval gate; `kdms:check-overdue-tasks`. |
| **CRM** | `Company`, `Contact`, `Lead`, `PipelineHistory`, `LeadInteraction`, `FollowUp`, `Proposal`, `Quotation` | `LeadPipelineService` (10 stages, mandatory `lost_reason` / `next_follow_up_at`), `ConvertWonLeadToProjectAction` (zero client duplication). |
| **Project** | `Project`, `ProjectMember`, `ProjectStage`, `Milestone`, `Requirement`, `AcceptanceCriterion`, `QaReport`, `UatRecord`, `Release`, `HandoverRecord`, `MaintenanceTicket` | `ProjectStageGateService`: 12-stage Website & CMS and 13-stage Custom Software workflows with sequential & domain gates (Approved Req, 0-Critical/High QA, Approved UAT, Safe Release Backup+Rollback, Handover). |
| **Portfolio** | `DemoProduct`, `DemoCriteriaCheck`, `DemoAsset` | `DemoReadinessService`: max 2 active demos concurrently; 6 Sheet-10 readiness criteria + dual Aldo (technical) & Albert (commercial) sign-off. |
| **Marketing** | `ContentItem`, `ContentAsset`, `ContentApproval`, `ContentMetric` | `ContentWorkflowService`: H-5/H-2 workflow, reviewer RBAC separation, hard publication block for `Portfolio Showcase` / `Demo Product` / `Case Study` until linked demo is `Ready to Present`. |
| **Finance** | `FinancialSetting`, `Budget`, `Invoice`, `InvoicePayment`, `Transaction` | `FinancePolicy` (write access strictly restricted to Albert & Farizy `D-05`), `InvoicePaymentService` (atomic ledger sync), `CashflowService` (strictly separates pipeline estimates from confirmed revenue). |
| **KPI** | `KpiDefinition`, `KpiEvaluation`, `KpiEvaluationItem` | `KpiService`: enforces weight sum = `1.00` per member across `35` KPIs; computes weighted score `SUM(weight × score)`. |
| **Governance & Workspace** | `Risk`, `RiskReview`, `Decision`, `MeetingForum`, `Meeting`, `MeetingMinute`, `ActionItem`, `WeeklyReport`, `QuarterlyReview`, `Document`, `ImportBatch`, `AuditLog` | `RiskAndDecisionService` (high-risk `>=15` contingency plan gate), `MeetingService` (H-1 agenda gate + 24h minutes SLA), `FullWorkbookOrchestratorService` (dry-run & idempotent Excel import/export). |

## 3. Scheduled Automations (`routes/console.php`, `Asia/Jakarta`)
- `07:00`: `kdms:check-overdue-tasks`
- `07:30`: `kdms:check-crm-followups`
- `08:00`: `kdms:check-content-deadlines`
- `08:30`: `kdms:check-overdue-invoices`
- `09:00`: `kdms:check-meeting-slas`
- `23:30`: `kdms:backup-database`

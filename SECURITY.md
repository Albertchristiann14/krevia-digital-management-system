# Krevia DMS — Self-Hosted Application Security Architecture

## 1. Authentication (Self-Managed)
- **Mechanism:** Stateful Laravel session cookies (`SESSION_DRIVER=database` or `redis` on VPS, `HttpOnly`, `SameSite=Lax`, `Secure` over HTTPS).
- **Password Hashing:** `bcrypt` with `BCRYPT_ROUNDS=12` (`Hash::make()`).
- **Brute-Force Protection:** Rate-limited login endpoint via Laravel `RateLimiter` / `LoginRequest` throttling.
- **Account Lifecycle:**
  - No public self-registration. Accounts are provisioned strictly by authorized executives (`Founder`, `Director of Operations`, `CTO`) via `/admin/accounts`.
  - Deactivated (`is_active = false`) or soft-deleted users are blocked at login and on active requests by `EnsureUserIsActive` middleware.
  - `must_change_password` flag enforces password rotation on initial/reset credentials.

## 2. Authorization (Replacing Supabase RLS)
All access control is enforced **server-side** before data queries or mutations execute:
- **RBAC (Spatie Permission):** 7 company roles (`Founder / Managing Director`, `Director of Operations`, `CTO / Technology Lead`, `System Analyst`, `Backend Engineer`, `Technical Contributor`, `Social Media & Graphic Design`) mapped to granular permissions.
- **Segregation of Duties (Business Rule D-05):**
  - `User::canManageFinance()` (`manage-finance` Gate) strictly restricts financial writes (`invoices`, `transactions`, `budgets`, `journals`, `payments`, `compensations`) to **Founder** and **Director of Operations**.
  - **CTO** has read-only `finance.view` access and cannot mutate financial records.
- **Founder Approval Authority:**
  - `ApprovalWorkflowService::approve/reject` and `AccountingPeriodService::reopenPeriod` strictly enforce `$user->isManagingDirector()` (`403 Forbidden` for all other roles).
- **Row-Level Ownership Isolation:**
  - `AccountingSuiteController::myCompensations` filters strictly by `where('user_id', $request->user()->id)` — team members can never view another member's compensation or access `/finance` / `/finance/suite`.

## 3. Private File Storage Security
- **Storage Location:** `storage/app/private` (outside `public/` web root; never directly servable by Nginx).
- **Categories:** `documents/`, `task-evidences/`, `finance-evidence/`, `finance-receipts/`, `demo-assets/`, `content-assets/`.
- **Download Controls:** Files are served exclusively through authenticated controller routes (`Storage::disk('local')->download(...)`) after verifying Laravel Policy / Gate authorization (`403` if unauthorized), preventing IDOR and path traversal.

## 4. Infrastructure & HTTP Security
- **Security Headers:** `SecurityHeaders` middleware + Nginx TLS headers (`HSTS`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`).
- **CSRF Protection:** Active on all state-changing `web` routes (`PreventRequestForgery`).
- **Network Isolation:** MySQL 8.4 and Redis run inside an internal Docker bridge network with **zero public port bindings**. Only Nginx (`80`/`443`) is exposed.

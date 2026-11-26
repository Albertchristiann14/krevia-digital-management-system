# Krevia DMS — Supabase-to-MySQL & Self-Hosted Migration Audit

**Date:** 2026-11-26  
**Scope:** Full repository audit across backend, frontend, database, authentication, authorization, storage, realtime, and deployment infrastructure.

---

## 1. Current Architecture Inventory

| Layer | Technology | Status |
| :--- | :--- | :--- |
| **Backend Framework** | Laravel 13.17 (PHP 8.3+) | Self-hosted ready |
| **Frontend Framework** | React 19 + Inertia.js 3.11 + Vite 8 + Tailwind CSS 4 | Self-hosted ready |
| **Authorization** | Spatie Laravel Permission 8.5 + Laravel Policies & Gates | Self-hosted ready |
| **Database** | Previously targeted Supabase PostgreSQL (`pgsql`); local/test already uses MySQL 8.4 | Migrating primary to MySQL 8.4 |
| **File Storage** | Laravel `local` disk (`storage/app/private`) + authenticated controller downloads | Self-hosted ready |
| **Queue & Cache** | Predis / Redis (`predis/predis`) or Database driver | Self-hosted ready via Docker Redis |

---

## 2. Supabase Dependency Audit

A full codebase search (`app/`, `config/`, `resources/js/`, `routes/`, `package.json`, `composer.json`) confirmed:

| Area | Supabase Usage Found? | Replacement Strategy |
| :--- | :--- | :--- |
| **Frontend JS SDK (`@supabase/supabase-js`)** | **None** | No removal needed; Inertia + Laravel handles all API/state. |
| **Supabase Auth** | **None** | Already uses Laravel session-based auth (`AuthenticatedSessionController`), bcrypt (`BCRYPT_ROUNDS=12`), login throttling, and `EnsureUserIsActive`. |
| **Supabase Row Level Security (RLS)** | **None** | Already enforced server-side via Spatie RBAC, Policies, Gates (`manage-finance`, `manage-accounts`), and query scoping (e.g. `MyCompensations` scoped to `user_id`). |
| **Supabase Storage Buckets** | **None** | Already uses Laravel `local` private disk (`storage/app/private`) with authenticated streaming downloads (`Storage::disk('local')->download(...)`). |
| **Supabase Realtime** | **None** | Notifications use Laravel database/mail/WhatsApp channels (`NotificationDispatchService`). No WebSocket/Realtime server needed unless live push is added later. |
| **Supabase Edge Functions** | **None** | All business logic executes in Laravel Controllers, Domain Services, and Console Commands. |
| **Supabase PostgreSQL (`pgsql`)** | **Yes (DB Host & Config)** | Replace `DB_CONNECTION=pgsql` default in `config/database.php` & `.env.example` with **MySQL 8.4** inside private Docker network. Provide read-only PostgreSQL-to-MySQL data migration script (`scripts/migrate_supabase_to_mysql.php`). |
| **Vercel Serverless Adapter** | **Yes (`vercel.json`, `api/index.php`)** | Superseded for VPS hosting by `Dockerfile`, `docker-compose.yml`, `docker-compose.production.yml`, and Nginx + Certbot HTTPS. |

---

## 3. PostgreSQL-to-MySQL Compatibility Assessment

All 16 migration files in `database/migrations/` were audited for MySQL 8.4 compatibility:
- **UUIDs:** Finance tables (`2026_11_25_900001` & `900002`) use `$table->uuid('id')->primary()`, which Laravel maps to `CHAR(36)` in MySQL 8.4.
- **Identifier Lengths:** All foreign key constraint names were already shortened (`fin_cfg_*_fk`, `fin_trf_*_fk`, `fin_bsl_jline_fk`) to stay under MySQL's 64-character identifier limit.
- **Monetary Precision:** All new finance monetary columns use `DECIMAL(20,2)` (`NUMERIC(20,2)` equivalent), avoiding floating-point drift.
- **JSON & Booleans:** MySQL 8.4 supports native `JSON` and `TINYINT(1)` booleans with Eloquent model casting.
- **Case-Insensitive Search:** Controller `whereLike(..., caseSensitive: false)` compiles to `LIKE` on MySQL `utf8mb4_unicode_ci` (naturally case-insensitive).
- **Timestamps & Strict Mode:** MySQL 8.4 `STRICT_TRANS_TABLES` is enabled; all nullable dates/timestamps are explicitly nullable.

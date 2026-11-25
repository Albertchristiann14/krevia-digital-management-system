# Krevia Digital Management System (KDMS) — User Guide

## 1. Access & Team Roles
All 7 original team members preserve their official positions and decision authorities (`D-02`):
1. **Albert Christian** (`Founder / Managing Director`) — Final commercial & business decisions, Demo Commercial Approval, KPI & Decision approval, full Finance management.
2. **Farizy Rahman Hidayat** (`Director of Operations`) — Operational coordination, task tracking, meeting governance, Risk management, full Finance management (`D-05`).
3. **Aldo E. Sianturi** (`CTO / Technology Lead`) — Architecture, QA & technical approvals, Demo Technical Approval, read-only Finance visibility (`finance.view`).
4. **Febriana** (`System Analyst & Client Relations Specialist`) — Requirement gathering, UAT coordination, CRM & Marketing content review (`Service Education`, `Business Problems`).
5. **MHD Yoga Andhika** (`Core Systems & Backend Engineer`) — Backend engineering, deployments, maintenance tickets, Demo CMS/backend support.
6. **Ananta Firdaus** (`Dedicated Technical Contributor`) — Assigned technical tasks, Demo implementation, read-only CRM/Portfolio/Own KPI access.
7. **Jihanz Fairuz Tsani** (`Social Media & Graphic Design`) — Visual branding, Content Calendar (`C-001`–`C-158`), H-5 production & H-2 review submission, publishing approved posts.

## 2. Core Operational Workflows
- **Tasks & Workplan:** Move tasks through `Not Started → In Progress → Under Review → Completed`. Completion requires attached evidence (`/tasks/{id}`) and reviewer approval.
- **CRM → Project Conversion:** Track prospects across all 10 pipeline stages (`/crm/leads`). Once a prospect reaches `Won`, use **Convert Won to Project** to generate a 12-stage Website & CMS or 13-stage Custom Software engagement without duplicating client data.
- **Portfolio & Marketing Gate:** Maximum 2 demos may remain `In Progress` simultaneously. `Portfolio Showcase`, `Demo Product`, and `Case Study` posts cannot be scheduled or published until the linked demo passes all 6 Sheet-10 criteria and dual Aldo + Albert sign-off.
- **Financial Tracking (`D-05` & `D-12`):** Only Albert and Farizy can confirm opening cash balance, edit 2027 budget targets, issue invoices, record payments (which automatically credit the Transaction Ledger), or record expenses. Pipeline estimates are displayed separately and never counted as received revenue.
- **Meetings, Risks & Documents:** Meetings require an H-1 Agenda before minutes can be logged (tracked against a 24h SLA). High risks (`L × I ≥ 15`) require a contingency plan. Sensitive files belong in the **Private Document Center** (`/documents`).

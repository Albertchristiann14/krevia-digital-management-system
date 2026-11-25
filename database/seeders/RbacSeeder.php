<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RbacSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            // Dashboard & Organization
            'dashboard.view',
            'organization.view',
            'organization.create',
            'organization.edit',
            'organization.delete',
            'organization.approve',
            'organization.export',
            'organization.manage',
            'roles.view',
            'roles.manage',

            // Workplan & Tasks
            'workplan.view',
            'workplan.create',
            'workplan.edit',
            'workplan.approve',
            'workplan.export',
            'tasks.view',
            'tasks.create',
            'tasks.edit',
            'tasks.delete',
            'tasks.assign',
            'tasks.approve',
            'tasks.manage',

            // CRM & Pipeline
            'crm.view',
            'crm.create',
            'crm.edit',
            'crm.delete',
            'crm.export',
            'crm.manage',

            // Projects & Delivery
            'projects.view',
            'projects.create',
            'projects.edit',
            'projects.delete',
            'projects.approve_commercial',
            'projects.approve_technical',
            'projects.approve_qa',
            'projects.manage',

            // Portfolio & Demos
            'demos.view',
            'demos.create',
            'demos.edit',
            'demos.approve_technical',
            'demos.approve_commercial',
            'demos.manage',

            // Marketing & Social Media
            'marketing.view',
            'marketing.create',
            'marketing.edit',
            'marketing.approve',
            'marketing.publish',
            'marketing.manage',

            // Finance (Write strictly restricted to Albert & Farizy)
            'finance.view',
            'finance.create',
            'finance.edit',
            'finance.delete',
            'finance.approve',
            'finance.export',
            'finance.manage',

            // KPI & Performance
            'kpi.view_own',
            'kpi.view_all',
            'kpi.edit',
            'kpi.approve',
            'kpi.export',
            'kpi.manage',

            // Governance: Meetings, Risks, Decisions, Documents, Audit
            'meetings.view',
            'meetings.create',
            'meetings.edit',
            'meetings.manage',
            'risks.view',
            'risks.create',
            'risks.edit',
            'risks.manage',
            'decisions.view',
            'decisions.create',
            'decisions.edit',
            'decisions.approve',
            'decisions.manage',
            'documents.view',
            'documents.upload',
            'documents.delete',
            'documents.export',
            'audit.view',
            'imports.manage',
            'users.manage',
            'announcements.manage',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        $rolePermissions = [
            User::ROLE_FOUNDER => [
                'dashboard.view',
                'organization.view', 'organization.edit', 'organization.approve', 'organization.export', 'organization.manage',
                'roles.view', 'roles.manage',
                'workplan.view', 'workplan.approve', 'workplan.export',
                'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign', 'tasks.approve',
                'crm.view', 'crm.create', 'crm.edit', 'crm.delete', 'crm.export', 'crm.manage',
                'projects.view', 'projects.approve_commercial',
                'demos.view', 'demos.approve_commercial',
                'marketing.view', 'marketing.approve',
                'finance.view', 'finance.create', 'finance.edit', 'finance.delete', 'finance.approve', 'finance.export', 'finance.manage',
                'kpi.view_own', 'kpi.view_all', 'kpi.approve', 'kpi.export',
                'meetings.view', 'meetings.create', 'meetings.edit',
                'risks.view', 'risks.create', 'risks.edit', 'risks.manage',
                'decisions.view', 'decisions.create', 'decisions.edit', 'decisions.approve', 'decisions.manage',
                'documents.view', 'documents.upload', 'documents.delete', 'documents.export',
                'audit.view', 'imports.manage', 'users.manage', 'announcements.manage',
            ],
            User::ROLE_OPERATIONS => [
                'dashboard.view',
                'organization.view', 'organization.create', 'organization.edit', 'organization.export', 'organization.manage',
                'roles.view', 'roles.manage',
                'workplan.view', 'workplan.create', 'workplan.edit', 'workplan.export',
                'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.assign', 'tasks.approve', 'tasks.manage',
                'crm.view', 'crm.export',
                'projects.view', 'projects.create', 'projects.edit', 'projects.approve_qa', 'projects.manage',
                'demos.view', 'demos.edit', 'demos.manage',
                'marketing.view', 'marketing.approve',
                'finance.view', 'finance.create', 'finance.edit', 'finance.delete', 'finance.approve', 'finance.export', 'finance.manage',
                'kpi.view_own', 'kpi.view_all', 'kpi.edit', 'kpi.export', 'kpi.manage',
                'meetings.view', 'meetings.create', 'meetings.edit', 'meetings.manage',
                'risks.view', 'risks.create', 'risks.edit', 'risks.manage',
                'decisions.view', 'decisions.create', 'decisions.edit',
                'documents.view', 'documents.upload', 'documents.export',
                'audit.view', 'imports.manage', 'users.manage', 'announcements.manage',
            ],
            User::ROLE_CTO => [
                'dashboard.view',
                'organization.view', 'organization.edit',
                'roles.view',
                'workplan.view', 'workplan.approve',
                'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign', 'tasks.approve',
                'crm.view', 'crm.edit',
                'projects.view', 'projects.edit', 'projects.approve_technical', 'projects.approve_qa', 'projects.manage',
                'demos.view', 'demos.create', 'demos.edit', 'demos.approve_technical',
                'marketing.view', 'marketing.approve',
                'finance.view',
                'kpi.view_own', 'kpi.view_all', 'kpi.edit',
                'meetings.view', 'meetings.create', 'meetings.edit',
                'risks.view', 'risks.create', 'risks.edit', 'risks.manage',
                'decisions.view', 'decisions.create', 'decisions.edit',
                'documents.view', 'documents.upload', 'documents.export',
                'users.manage', 'announcements.manage',
            ],
            User::ROLE_SYSTEM_ANALYST => [
                'dashboard.view',
                'organization.view',
                'workplan.view',
                'tasks.view', 'tasks.create', 'tasks.edit',
                'crm.view', 'crm.edit',
                'projects.view', 'projects.edit',
                'demos.view', 'demos.edit',
                'marketing.view', 'marketing.approve',
                'kpi.view_own',
                'meetings.view', 'meetings.create', 'meetings.edit',
                'risks.view', 'risks.edit',
                'decisions.view',
                'documents.view', 'documents.upload',
            ],
            User::ROLE_BACKEND_ENGINEER => [
                'dashboard.view',
                'organization.view',
                'workplan.view',
                'tasks.view', 'tasks.create', 'tasks.edit',
                'crm.view',
                'projects.view', 'projects.edit',
                'demos.view', 'demos.edit',
                'marketing.view',
                'kpi.view_own',
                'meetings.view',
                'risks.view', 'risks.create',
                'decisions.view',
                'documents.view', 'documents.upload',
            ],
            User::ROLE_TECH_CONTRIBUTOR => [
                'dashboard.view',
                'organization.view',
                'workplan.view',
                'tasks.view', 'tasks.edit',
                'projects.view', 'projects.edit',
                'demos.view', 'demos.edit',
                'marketing.view',
                'kpi.view_own',
                'meetings.view',
                'risks.view',
                'decisions.view',
                'documents.view', 'documents.upload',
            ],
            User::ROLE_SOCIAL_DESIGN => [
                'dashboard.view',
                'organization.view',
                'workplan.view',
                'tasks.view', 'tasks.create', 'tasks.edit',
                'crm.view',
                'projects.view',
                'demos.view', 'demos.edit',
                'marketing.view', 'marketing.create', 'marketing.edit', 'marketing.publish', 'marketing.manage',
                'kpi.view_own',
                'meetings.view',
                'risks.view',
                'decisions.view',
                'documents.view', 'documents.upload',
            ],
        ];

        foreach ($rolePermissions as $roleName => $perms) {
            $role = Role::findOrCreate($roleName, 'web');
            $role->syncPermissions($perms);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
}

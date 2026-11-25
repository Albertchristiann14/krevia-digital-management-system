export interface AuthUserProfile {
    id: number;
    employee_code: string;
    avatar_color: string;
    position: string | null;
    department: string | null;
    department_color: string | null;
    whatsapp_number?: string | null;
    notification_email?: string | null;
}

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    must_change_password?: boolean;
    roles: string[];
    permissions: string[];
    can_manage_finance: boolean;
    can_manage_accounts?: boolean;
    profile: AuthUserProfile | null;
}

export interface PageProps {
    app: {
        name: string;
        fullName: string;
        tagline: string;
        period: string;
    };
    auth: {
        user: AuthUser | null;
        unreadNotificationsCount: number;
    };
    flash: {
        success: string | null;
        error: string | null;
        warning: string | null;
    };
    [key: string]: unknown;
}

export interface JobDescriptionData {
    purpose: string;
    responsibilities: string[];
    routine_tasks: string[];
    project_tasks: string[];
    expected_outputs: string[];
    success_indicators: string[];
    authority_limits: string[];
    coordination_links: string[];
}

export interface EmployeeProfileItem {
    id: number;
    user_id: number;
    employee_code: string;
    name: string;
    email: string;
    is_active: boolean;
    role: string | null;
    department_id: number;
    department: string;
    department_code: string;
    department_color: string;
    position_id: number;
    position: string;
    level: string;
    authority_summary: string | null;
    primary_supervisor_id: number | null;
    primary_supervisor: string | null;
    secondary_supervisor_id: number | null;
    secondary_supervisor: string | null;
    coordination_note: string | null;
    coordination_status: string;
    focus_summary: string | null;
    weekly_capacity_hours: number | null;
    capacity_status: string;
    employment_status: string;
    joined_at: string | null;
    avatar_color: string;
    job_description: JobDescriptionData | null;
}

export interface DepartmentItem {
    id: number;
    code: string;
    name: string;
    color_hex: string;
    description: string | null;
    lead: string | null;
    members_count: number;
}

export interface RaciUserItem {
    id: number;
    name: string;
    short_name: string;
    employee_code: string;
}

export interface RaciActivityItem {
    id: number;
    sort_order: number;
    activity_name: string;
    notes: string | null;
    data_status: string;
    assignments: Record<number, string>;
}

export interface AuditLogItem {
    id: number;
    event: string;
    summary: string;
    actor: string;
    ip_address: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    created_at: string;
}

export interface AnnualRoadmapItem {
    id: number;
    period_month: string;
    month_label: string;
    phase_label: string;
    primary_focus: string;
    target_summary: string | null;
    priority_work: string | null;
    expected_output: string | null;
    pic_user_id: number | null;
    pic_name: string | null;
    success_indicator: string | null;
    target_contacts: number;
    target_meetings: number;
    target_proposals: number;
    target_won: number;
    target_status: string;
    tasks_count: number;
    completed_tasks_count: number;
    in_progress_tasks_count: number;
    overdue_tasks_count: number;
}

export interface TaskListItem {
    id: number;
    code: string;
    title: string;
    description: string | null;
    expected_result: string | null;
    pic_user_id: number;
    pic_name: string | null;
    pic_avatar_color: string;
    department: string | null;
    department_color: string | null;
    reviewer_user_id: number | null;
    reviewer_name: string | null;
    priority: string;
    start_date: string | null;
    deadline: string;
    status: string;
    progress_pct: number;
    is_blocked: boolean;
    blocker_note: string | null;
    deadline_status: string;
    month_label: string | null;
    subtasks_count: number;
    evidences_count: number;
    comments_count: number;
}

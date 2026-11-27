import { Head, Link, router } from '@inertiajs/react';
import { Building2, Loader2, Search, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { StatusBadge } from '@/Components/shared/StatusBadge';
import { UserAvatar } from '@/Components/shared/UserAvatar';
import { AppShell } from '@/Layouts/AppShell';

interface DirectoryMember {
    id: number;
    name: string;
    avatar_url: string | null;
    avatar_color: string;
    position: string;
    department: string;
    department_color: string;
    membership_status: string;
    is_active: boolean;
    employee_code: string | null;
}

interface PaginatorLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PeopleIndexProps {
    members: {
        data: DirectoryMember[];
        links: PaginatorLink[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: {
        search: string;
        department_id: string;
        position_id: string;
        status: string;
    };
    departments: { id: number; name: string }[];
    positions: { id: number; name: string }[];
    canManageDirectory: boolean;
}

export default function PeopleIndex({
    members,
    filters,
    departments,
    positions,
    canManageDirectory,
}: PeopleIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [departmentId, setDepartmentId] = useState(filters.department_id ?? '');
    const [positionId, setPositionId] = useState(filters.position_id ?? '');
    const [status, setStatus] = useState(filters.status ?? 'active');
    const [loading, setLoading] = useState(false);
    const isFirstRender = useRef(true);

    const runQuery = (next: {
        search: string;
        department_id: string;
        position_id: string;
        status: string;
    }) => {
        setLoading(true);
        router.get(
            '/people',
            {
                search: next.search || undefined,
                department_id: next.department_id || undefined,
                position_id: next.position_id || undefined,
                status: canManageDirectory ? next.status : undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => setLoading(false),
            },
        );
    };

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const timer = setTimeout(() => {
            runQuery({ search, department_id: departmentId, position_id: positionId, status });
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const handleSelectChange = (
        field: 'department_id' | 'position_id' | 'status',
        value: string,
    ) => {
        const next = {
            search,
            department_id: field === 'department_id' ? value : departmentId,
            position_id: field === 'position_id' ? value : positionId,
            status: field === 'status' ? value : status,
        };
        if (field === 'department_id') setDepartmentId(value);
        if (field === 'position_id') setPositionId(value);
        if (field === 'status') setStatus(value);
        runQuery(next);
    };

    return (
        <AppShell
            title="People"
            subtitle="Discover and connect with members of Krevia Digital."
        >
            <Head title="People — Member Directory" />

            {/* Search & Filters */}
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                    <div className="relative md:col-span-5">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={
                                canManageDirectory
                                    ? 'Search by name or employee ID...'
                                    : 'Search members by name...'
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-9 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#101D35] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                        {loading && (
                            <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                        )}
                    </div>

                    <div className="md:col-span-3">
                        <select
                            value={departmentId}
                            onChange={(e) => handleSelectChange('department_id', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#101D35] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                            <option value="">All Departments</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={canManageDirectory ? 'md:col-span-2' : 'md:col-span-4'}>
                        <select
                            value={positionId}
                            onChange={(e) => handleSelectChange('position_id', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#101D35] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                            <option value="">All Positions</option>
                            {positions.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {canManageDirectory && (
                        <div className="md:col-span-2">
                            <select
                                value={status}
                                onChange={(e) => handleSelectChange('status', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#101D35] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                                <option value="active">Active Members</option>
                                <option value="inactive">Inactive Members</option>
                                <option value="all">All Statuses</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Directory Grid */}
            {members.data.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <Users className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                        No members found
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Try adjusting your search query or filters.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {members.data.map((member) => (
                        <div
                            key={member.id}
                            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                        >
                            <div>
                                <div className="flex items-start justify-between gap-2">
                                    <UserAvatar
                                        name={member.name}
                                        avatarUrl={member.avatar_url}
                                        avatarColor={member.avatar_color}
                                        size="xl"
                                        className="h-16 w-16 text-lg ring-2 ring-slate-100 dark:ring-slate-800"
                                    />
                                    <StatusBadge
                                        label={member.membership_status}
                                        tone={member.is_active ? 'green' : 'red'}
                                    />
                                </div>

                                <div className="mt-4">
                                    <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                        {member.name}
                                    </h3>
                                    <p className="mt-0.5 truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                                        {member.position}
                                    </p>
                                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{member.department}</span>
                                    </div>
                                    {member.employee_code && (
                                        <p className="mt-1.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                            {member.employee_code}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-5 border-t border-slate-100 pt-3.5 dark:border-slate-800">
                                <Link
                                    href={`/people/${member.id}`}
                                    className="flex w-full items-center justify-center rounded-lg bg-[#101D35] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#192c4f] dark:bg-blue-600 dark:hover:bg-blue-700"
                                >
                                    View Profile
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {members.last_page > 1 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Showing page {members.current_page} of {members.last_page} ({members.total}{' '}
                        members)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {members.links.map((link, idx) => (
                            <button
                                key={`${link.label}-${idx}`}
                                type="button"
                                disabled={!link.url}
                                onClick={() => {
                                    if (link.url) {
                                        router.visit(link.url, {
                                            preserveScroll: true,
                                            preserveState: true,
                                        });
                                    }
                                }}
                                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                                    link.active
                                        ? 'bg-[#101D35] text-white dark:bg-blue-600'
                                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                                } disabled:opacity-40`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </AppShell>
    );
}

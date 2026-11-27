import { Check, ChevronDown, Search, UserX, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { UserAvatar } from '@/Components/shared/UserAvatar';
import { cn } from '@/lib/utils';

export interface UserPickerOption {
    id: number;
    name: string;
    email?: string | null;
    avatar_url?: string | null;
    avatar_color?: string | null;
}

interface UserPickerProps {
    users: UserPickerOption[];
    value: string;
    onChange: (nextId: string) => void;
    placeholder?: string;
    allowClear?: boolean;
    disabled?: boolean;
    error?: string;
}

export function UserPicker({
    users,
    value,
    onChange,
    placeholder = 'Select Person in Charge (PIC)...',
    allowClear = true,
    disabled = false,
    error,
}: UserPickerProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement | null>(null);

    const selectedUser = useMemo(
        () => users.find((u) => String(u.id) === String(value)) ?? null,
        [users, value],
    );

    const filteredUsers = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return users;
        return users.filter(
            (u) =>
                u.name.toLowerCase().includes(q) ||
                (u.email && u.email.toLowerCase().includes(q)),
        );
    }, [users, query]);

    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative">
            <div
                className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs transition dark:border-slate-700 dark:bg-slate-800',
                    disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-600',
                    error && 'border-rose-400 dark:border-rose-500',
                )}
                onClick={() => {
                    if (!disabled) {
                        setOpen((prev) => !prev);
                    }
                }}
            >
                {selectedUser ? (
                    <div className="flex min-w-0 items-center gap-2">
                        <UserAvatar
                            name={selectedUser.name}
                            avatarUrl={selectedUser.avatar_url}
                            avatarColor={selectedUser.avatar_color}
                            size="xs"
                            className="h-5 w-5"
                        />
                        <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                                {selectedUser.name}
                            </p>
                        </div>
                    </div>
                ) : (
                    <span className="truncate text-slate-400">{placeholder}</span>
                )}

                <div className="flex shrink-0 items-center gap-1">
                    {allowClear && selectedUser && !disabled && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                            }}
                            title="Clear selection"
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </div>
            </div>

            {open && !disabled && (
                <div className="absolute right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#162238]">
                    <div className="border-b border-slate-100 p-2 dark:border-slate-800">
                        <div className="relative flex items-center">
                            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search member by name or email..."
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-2.5 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#101D35] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto p-1">
                        {allowClear && (
                            <button
                                type="button"
                                onClick={() => {
                                    onChange('');
                                    setOpen(false);
                                    setQuery('');
                                }}
                                className={cn(
                                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition',
                                    !value
                                        ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-white'
                                        : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60',
                                )}
                            >
                                <UserX className="h-4 w-4 shrink-0 text-slate-400" />
                                <span>Unassigned (No PIC)</span>
                            </button>
                        )}

                        {filteredUsers.length === 0 ? (
                            <p className="px-3 py-4 text-center text-xs text-slate-400">
                                No matching active members
                            </p>
                        ) : (
                            filteredUsers.map((u) => {
                                const isSelected = String(u.id) === String(value);
                                return (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(String(u.id));
                                            setOpen(false);
                                            setQuery('');
                                        }}
                                        className={cn(
                                            'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition',
                                            isSelected
                                                ? 'bg-[#101D35] text-white dark:bg-blue-600'
                                                : 'text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800',
                                        )}
                                    >
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            <UserAvatar
                                                name={u.name}
                                                avatarUrl={u.avatar_url}
                                                avatarColor={u.avatar_color}
                                                size="xs"
                                                className="h-6 w-6"
                                            />
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">{u.name}</p>
                                                {u.email && (
                                                    <p
                                                        className={cn(
                                                            'truncate text-[10px]',
                                                            isSelected ? 'text-slate-200' : 'text-slate-400',
                                                        )}
                                                    >
                                                        {u.email}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {error && <p className="mt-1 text-[11px] text-rose-600">{error}</p>}
        </div>
    );
}

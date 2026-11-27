import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    accent?: 'navy' | 'blue' | 'green' | 'amber' | 'red';
    dark?: boolean;
}

const ICON_TONE = {
    navy: 'bg-[#101D35]/10 text-[#101D35] dark:bg-[#6C8CFF]/15 dark:text-[#6C8CFF]',
    blue: 'bg-blue-50 text-blue-600 dark:bg-[#55D6E8]/15 dark:text-[#55D6E8]',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-[#42C99A]/15 dark:text-[#42C99A]',
    amber: 'bg-amber-50 text-amber-600 dark:bg-[#F4B860]/15 dark:text-[#F4B860]',
    red: 'bg-rose-50 text-rose-600 dark:bg-[#F07183]/15 dark:text-[#F07183]',
};

export function StatCard({
    label,
    value,
    subtitle,
    icon: Icon,
    accent = 'navy',
    dark = false,
}: StatCardProps) {
    return (
        <div
            className={cn(
                'krevia-card-hover relative overflow-hidden rounded-2xl border p-5',
                dark
                    ? 'border-[#6C8CFF]/30 bg-gradient-to-br from-[#101D35] via-[#132442] to-[#0D1729] text-white shadow-[0_8px_30px_rgba(16,29,53,0.22)] dark:shadow-[0_8px_32px_rgba(108,140,255,0.14)]'
                    : 'border-slate-200/90 bg-white/85 text-slate-900 shadow-[0_2px_10px_rgba(16,29,53,0.04)] backdrop-blur-md dark:border-white/[0.09] dark:bg-white/[0.045] dark:text-[#F4F7FF]',
            )}
        >
            <div
                className={cn(
                    'pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full blur-2xl',
                    dark ? 'bg-[#6C8CFF]/25' : 'bg-[#6C8CFF]/10 dark:bg-[#6C8CFF]/15',
                )}
            />
            <div className="relative flex items-start justify-between gap-3">
                <div>
                    <p
                        className={cn(
                            'text-[11px] font-semibold tracking-wider uppercase',
                            dark ? 'text-slate-300' : 'text-slate-500 dark:text-[#A4B0C5]',
                        )}
                    >
                        {label}
                    </p>
                    <p className="mt-2 font-display text-2xl font-bold tracking-tight tabular-nums">
                        {value}
                    </p>
                </div>
                <div
                    className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
                        dark
                            ? 'bg-white/10 text-[#55D6E8] ring-white/15'
                            : cn(ICON_TONE[accent], 'ring-black/5 dark:ring-white/10'),
                    )}
                >
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            {subtitle && (
                <p
                    className={cn(
                        'relative mt-3 text-xs',
                        dark ? 'text-slate-300' : 'text-slate-500 dark:text-[#6F7D95]',
                    )}
                >
                    {subtitle}
                </p>
            )}
        </div>
    );
}

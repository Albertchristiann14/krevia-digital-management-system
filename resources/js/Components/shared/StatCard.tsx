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
    navy: 'bg-[#101D35]/10 text-[#101D35]',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-rose-50 text-rose-600',
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
                'rounded-xl border p-5 transition-colors',
                dark
                    ? 'border-[#1E3256] bg-[#101D35] text-white'
                    : 'border-slate-200 bg-white text-slate-900 shadow-[0_1px_2px_rgba(16,29,53,0.04)]',
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p
                        className={cn(
                            'text-xs font-medium tracking-wide uppercase',
                            dark ? 'text-slate-300' : 'text-slate-500',
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
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                        dark ? 'bg-white/10 text-white' : ICON_TONE[accent],
                    )}
                >
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            {subtitle && (
                <p className={cn('mt-3 text-xs', dark ? 'text-slate-300' : 'text-slate-500')}>
                    {subtitle}
                </p>
            )}
        </div>
    );
}

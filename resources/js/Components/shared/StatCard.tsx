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

const ACCENT_STYLES = {
    navy: {
        card: 'border-slate-200/80 bg-white dark:border-[#668CFF]/28 dark:bg-gradient-to-br dark:from-[#15223A]/90 dark:via-[#101A30]/85 dark:to-[#0B1222]/90',
        glow: 'rgba(102, 140, 255, 0.22)',
        icon: 'bg-blue-50 text-blue-600 ring-blue-200/70 dark:bg-gradient-to-br dark:from-[#668CFF]/25 dark:to-[#A17AFF]/20 dark:text-[#8DA8FF] dark:ring-[#668CFF]/35',
    },
    blue: {
        card: 'border-slate-200/80 bg-white dark:border-[#45D8E8]/22 dark:bg-gradient-to-br dark:from-[#13203A]/85 dark:via-[#0E182D]/85 dark:to-[#0B1222]/90',
        glow: 'rgba(69, 216, 232, 0.20)',
        icon: 'bg-sky-50 text-sky-600 ring-sky-200/70 dark:bg-gradient-to-br dark:from-[#45D8E8]/25 dark:to-[#668CFF]/15 dark:text-[#45D8E8] dark:ring-[#45D8E8]/35',
    },
    green: {
        card: 'border-slate-200/80 bg-white dark:border-[#42C99A]/22 dark:bg-gradient-to-br dark:from-[#13203A]/85 dark:via-[#0E182D]/85 dark:to-[#0B1222]/90',
        glow: 'rgba(66, 201, 154, 0.20)',
        icon: 'bg-emerald-50 text-emerald-600 ring-emerald-200/70 dark:bg-gradient-to-br dark:from-[#42C99A]/25 dark:to-[#45D8E8]/15 dark:text-[#42C99A] dark:ring-[#42C99A]/35',
    },
    amber: {
        card: 'border-slate-200/80 bg-white dark:border-[#F4B860]/22 dark:bg-gradient-to-br dark:from-[#13203A]/85 dark:via-[#0E182D]/85 dark:to-[#0B1222]/90',
        glow: 'rgba(244, 184, 96, 0.20)',
        icon: 'bg-amber-50 text-amber-600 ring-amber-200/70 dark:bg-gradient-to-br dark:from-[#F4B860]/25 dark:to-[#F07183]/15 dark:text-[#F4B860] dark:ring-[#F4B860]/35',
    },
    red: {
        card: 'border-slate-200/80 bg-white dark:border-[#F07183]/22 dark:bg-gradient-to-br dark:from-[#13203A]/85 dark:via-[#0E182D]/85 dark:to-[#0B1222]/90',
        glow: 'rgba(240, 113, 131, 0.22)',
        icon: 'bg-rose-50 text-rose-600 ring-rose-200/70 dark:bg-gradient-to-br dark:from-[#F07183]/25 dark:to-[#A17AFF]/15 dark:text-[#F07183] dark:ring-[#F07183]/35',
    },
};

export function StatCard({
    label,
    value,
    subtitle,
    icon: Icon,
    accent = 'navy',
    dark = false,
}: StatCardProps) {
    const tone = dark ? ACCENT_STYLES.navy : ACCENT_STYLES[accent];

    return (
        <div
            className={cn(
                'krevia-glass krevia-card-hover relative overflow-hidden rounded-2xl border p-5 text-[var(--text-primary)]',
                tone.card,
            )}
        >
            <div
                className="pointer-events-none absolute -top-12 -right-12 hidden h-36 w-36 rounded-full dark:block"
                style={{ background: `radial-gradient(circle, ${tone.glow} 0%, transparent 70%)` }}
            />
            <div className="relative flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-[#A7B4CB]">
                        {label}
                    </p>
                    <p className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-[#F4F7FF]">
                        {value}
                    </p>
                </div>
                <div
                    className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
                        tone.icon,
                    )}
                >
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            {subtitle && (
                <p className="relative mt-3 text-xs text-slate-500 dark:text-[#71819C]">
                    {subtitle}
                </p>
            )}
        </div>
    );
}

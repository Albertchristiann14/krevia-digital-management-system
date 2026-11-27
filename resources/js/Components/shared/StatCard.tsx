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
        card: 'border-[#668CFF]/28 bg-gradient-to-br from-[#15223A]/90 via-[#101A30]/85 to-[#0B1222]/90',
        glow: 'rgba(102, 140, 255, 0.24)',
        icon: 'bg-gradient-to-br from-[#668CFF]/25 to-[#A17AFF]/20 text-[#8DA8FF] ring-[#668CFF]/35 shadow-[0_0_18px_rgba(102,140,255,0.22)]',
    },
    blue: {
        card: 'border-[#45D8E8]/22 bg-gradient-to-br from-[#13203A]/85 via-[#0E182D]/85 to-[#0B1222]/90',
        glow: 'rgba(69, 216, 232, 0.20)',
        icon: 'bg-gradient-to-br from-[#45D8E8]/25 to-[#668CFF]/15 text-[#45D8E8] ring-[#45D8E8]/35 shadow-[0_0_18px_rgba(69,216,232,0.20)]',
    },
    green: {
        card: 'border-[#42C99A]/22 bg-gradient-to-br from-[#13203A]/85 via-[#0E182D]/85 to-[#0B1222]/90',
        glow: 'rgba(66, 201, 154, 0.20)',
        icon: 'bg-gradient-to-br from-[#42C99A]/25 to-[#45D8E8]/15 text-[#42C99A] ring-[#42C99A]/35 shadow-[0_0_18px_rgba(66,201,154,0.20)]',
    },
    amber: {
        card: 'border-[#F4B860]/22 bg-gradient-to-br from-[#13203A]/85 via-[#0E182D]/85 to-[#0B1222]/90',
        glow: 'rgba(244, 184, 96, 0.20)',
        icon: 'bg-gradient-to-br from-[#F4B860]/25 to-[#F07183]/15 text-[#F4B860] ring-[#F4B860]/35 shadow-[0_0_18px_rgba(244,184,96,0.20)]',
    },
    red: {
        card: 'border-[#F07183]/22 bg-gradient-to-br from-[#13203A]/85 via-[#0E182D]/85 to-[#0B1222]/90',
        glow: 'rgba(240, 113, 131, 0.22)',
        icon: 'bg-gradient-to-br from-[#F07183]/25 to-[#A17AFF]/15 text-[#F07183] ring-[#F07183]/35 shadow-[0_0_18px_rgba(240,113,131,0.20)]',
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
                'krevia-card-hover relative overflow-hidden rounded-2xl border p-5 text-[#F4F7FF]',
                'shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_34px_-14px_rgba(0,0,0,0.72)]',
                tone.card,
            )}
        >
            <div
                className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full"
                style={{ background: `radial-gradient(circle, ${tone.glow} 0%, transparent 70%)` }}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            <div className="relative flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-semibold tracking-wider text-[#A7B4CB] uppercase">
                        {label}
                    </p>
                    <p className="mt-2 font-display text-3xl font-bold tracking-tight text-[#F4F7FF] tabular-nums">
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
                <p className="relative mt-3 text-xs text-[#71819C]">
                    {subtitle}
                </p>
            )}
        </div>
    );
}

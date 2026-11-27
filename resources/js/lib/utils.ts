import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatShortDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function formatRupiah(val: number | string | null | undefined): string {
    const num = Number(val) || 0;
    const absFormatted = new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: 0,
    }).format(Math.abs(Math.round(num)));

    return num < 0 ? `-Rp ${absFormatted}` : `Rp ${absFormatted}`;
}

export function formatPriorityLabel(priority: string | null | undefined): string {
    if (!priority) return '—';
    const map: Record<string, string> = {
        Tinggi: 'High',
        Sedang: 'Medium',
        Rendah: 'Low',
    };
    return map[priority] ?? priority;
}

export function formatFileSize(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

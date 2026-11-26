import { cn } from '@/lib/utils';

interface CurrencyInputProps {
    value: string | number;
    onChange: (rawValue: string) => void;
    placeholder?: string;
    required?: boolean;
    className?: string;
}

function formatDots(raw: string | number): string {
    const digits = String(raw ?? '').replace(/\D/g, '');
    if (!digits) return '';
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(digits));
}

export function CurrencyInput({
    value,
    onChange,
    placeholder = '1.000.000',
    required = false,
    className,
}: CurrencyInputProps) {
    const displayValue = formatDots(value);

    return (
        <div
            className={cn(
                'flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-[#101D35] focus-within:ring-1 focus-within:ring-[#101D35]',
                className,
            )}
        >
            <span className="select-none border-r border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                Rp
            </span>
            <input
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    onChange(digits);
                }}
                placeholder={placeholder}
                required={required}
                className="w-full bg-transparent px-2.5 py-1.5 text-xs font-medium text-slate-900 tabular-nums outline-none placeholder:text-slate-400"
            />
        </div>
    );
}

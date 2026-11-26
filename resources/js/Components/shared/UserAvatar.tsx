import { cn, getInitials } from '@/lib/utils';

interface UserAvatarProps {
    name: string;
    avatarUrl?: string | null;
    avatarColor?: string | null;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const SIZE_CLASSES = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-20 w-20 text-xl',
};

export function UserAvatar({
    name,
    avatarUrl,
    avatarColor = '#101D35',
    size = 'sm',
    className,
}: UserAvatarProps) {
    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={name}
                className={cn(
                    'shrink-0 rounded-full object-cover ring-1 ring-slate-200',
                    SIZE_CLASSES[size],
                    className,
                )}
            />
        );
    }

    return (
        <div
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full font-bold text-white',
                SIZE_CLASSES[size],
                className,
            )}
            style={{ backgroundColor: avatarColor || '#101D35' }}
        >
            {getInitials(name)}
        </div>
    );
}

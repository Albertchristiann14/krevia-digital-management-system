import { useEffect, useState } from 'react';
import { cn, getInitials } from '@/lib/utils';

interface UserAvatarProps {
    name?: string | null;
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
    const [imgFailed, setImgFailed] = useState(false);

    useEffect(() => {
        setImgFailed(false);
    }, [avatarUrl]);

    const displayName = name?.trim() || 'Krevia Member';

const SIZE_PX = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 64,
    xl: 80,
};

    if (avatarUrl && !imgFailed) {
        const px = SIZE_PX[size];
        return (
            <img
                src={avatarUrl}
                alt={displayName}
                width={px}
                height={px}
                decoding="async"
                onError={() => setImgFailed(true)}
                className={cn(
                    'shrink-0 rounded-full object-cover ring-1 ring-white/15',
                    SIZE_CLASSES[size],
                    className,
                )}
            />
        );
    }

    return (
        <div
            aria-label={displayName}
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-1 ring-white/10',
                SIZE_CLASSES[size],
                className,
            )}
            style={{ backgroundColor: avatarColor || '#101D35' }}
        >
            {name?.trim() ? getInitials(displayName) : 'KD'}
        </div>
    );
}

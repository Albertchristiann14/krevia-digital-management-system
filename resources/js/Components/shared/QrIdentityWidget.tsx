import { Download } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

interface QrIdentityWidgetProps {
    value: string | null;
    status: 'active' | 'inactive' | 'revoked' | string;
    fileName?: string;
    size?: number;
    showDownloads?: boolean;
}

export function QrIdentityWidget({
    value,
    status,
    fileName = 'krevia-digital-identity-qr',
    size = 180,
    showDownloads = true,
}: QrIdentityWidgetProps) {
    const [svgMarkup, setSvgMarkup] = useState<string>('');
    const [pngDataUrl, setPngDataUrl] = useState<string>('');

    useEffect(() => {
        let cancelled = false;
        if (!value || status !== 'active') {
            setSvgMarkup('');
            setPngDataUrl('');
            return;
        }

        const options = {
            width: size,
            margin: 3,
            errorCorrectionLevel: 'M' as const,
            color: {
                dark: '#101D35',
                light: '#FFFFFF',
            },
        };

        Promise.all([
            QRCode.toString(value, { ...options, type: 'svg' }),
            QRCode.toDataURL(value, { ...options, width: Math.max(size * 2, 512) }),
        ])
            .then(([svg, png]) => {
                if (!cancelled) {
                    setSvgMarkup(svg);
                    setPngDataUrl(png);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSvgMarkup('');
                    setPngDataUrl('');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [value, status, size]);

    const handleDownloadPng = () => {
        if (!pngDataUrl) {
            return;
        }
        const a = document.createElement('a');
        a.href = pngDataUrl;
        a.download = `${fileName}.png`;
        a.click();
    };

    const handleDownloadSvg = () => {
        if (!svgMarkup) {
            return;
        }
        const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.svg`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (status !== 'active' || !value) {
        return (
            <div
                style={{ width: size, height: size }}
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800/50"
            >
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    QR {status === 'inactive' ? 'Inactive' : 'Unavailable'}
                </span>
                <span className="mt-1 text-[11px] text-slate-400">
                    Activate QR identity to enable scanning
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <div
                className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xs dark:border-slate-700"
                style={{ width: size + 16, height: size + 16 }}
            >
                {pngDataUrl ? (
                    <img
                        src={pngDataUrl}
                        alt="Digital Identity QR Code"
                        className="h-full w-full object-contain"
                    />
                ) : (
                    <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
                )}
            </div>

            {showDownloads && pngDataUrl && (
                <div className="flex flex-wrap items-center justify-center gap-2 print:hidden">
                    <button
                        type="button"
                        onClick={handleDownloadPng}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        <Download className="h-3 w-3" />
                        PNG
                    </button>
                    <button
                        type="button"
                        onClick={handleDownloadSvg}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        <Download className="h-3 w-3" />
                        SVG
                    </button>
                </div>
            )}
        </div>
    );
}

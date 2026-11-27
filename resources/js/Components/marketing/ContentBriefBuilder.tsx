import {
    CONTENT_FORMATS,
    SLIDE_ROLES,
    STORY_INTERACTIVE_ELEMENTS,
    createDefaultStructuredBrief,
    createEmptyFrame,
    createEmptyScene,
    createEmptySlide,
    type CarouselSlide,
    type ContentFormat,
    type StoryFrame,
    type StructuredBrief,
    type VideoScene,
} from '@/Components/marketing/briefTypes';
import {
    ArrowDown,
    ArrowUp,
    ChevronDown,
    ChevronUp,
    Copy,
    Film,
    Image as ImageIcon,
    Layers,
    Plus,
    Smartphone,
    Trash2,
    Video,
} from 'lucide-react';
import { useState } from 'react';

interface ContentBriefBuilderProps {
    format: ContentFormat | '';
    onFormatChange: (format: ContentFormat) => void;
    value: StructuredBrief | null;
    onChange: (next: StructuredBrief) => void;
    legacyBrief?: string;
    onLegacyBriefChange?: (val: string) => void;
    disabled?: boolean;
    errors?: Record<string, string>;
}

const FORMAT_ICONS: Record<ContentFormat, typeof Layers> = {
    'Single Image': ImageIcon,
    Carousel: Layers,
    Reels: Film,
    Video: Video,
    Story: Smartphone,
};

export function ContentBriefBuilder({
    format,
    onFormatChange,
    value,
    onChange,
    legacyBrief,
    onLegacyBriefChange,
    disabled = false,
    errors = {},
}: ContentBriefBuilderProps) {
    const [collapsedKeys, setCollapsedKeys] = useState<Record<number, boolean>>({});
    const [showLegacyNotes, setShowLegacyNotes] = useState(false);

    const activeFormat: ContentFormat = (format || 'Single Image') as ContentFormat;
    const brief: StructuredBrief =
        value && value.format === activeFormat ? value : createDefaultStructuredBrief(activeFormat);

    const toggleCollapse = (index: number) => {
        setCollapsedKeys((prev) => ({ ...prev, [index]: !prev[index] }));
    };

    const handleFormatSwitch = (nextFormat: ContentFormat) => {
        if (disabled) return;
        onFormatChange(nextFormat);
        onChange(createDefaultStructuredBrief(nextFormat));
        setCollapsedKeys({});
    };

    // Generic list reorder/duplicate/delete helpers
    const moveItem = <T,>(list: T[], index: number, dir: -1 | 1): T[] => {
        const target = index + dir;
        if (target < 0 || target >= list.length) return list;
        const copy = [...list];
        [copy[index], copy[target]] = [copy[target], copy[index]];
        return copy;
    };

    const updateSlides = (nextSlides: CarouselSlide[]) => {
        onChange({
            ...brief,
            format: 'Carousel',
            slides: nextSlides.map((s, i) => ({ ...s, slide_number: i + 1 })),
        });
    };

    const updateScenes = (nextScenes: VideoScene[]) => {
        onChange({
            ...brief,
            format: activeFormat === 'Video' ? 'Video' : 'Reels',
            scenes: nextScenes.map((s, i) => ({ ...s, scene_number: i + 1 })),
        });
    };

    const updateFrames = (nextFrames: StoryFrame[]) => {
        onChange({
            ...brief,
            format: 'Story',
            frames: nextFrames.map((f, i) => ({ ...f, frame_number: i + 1 })),
        });
    };

    const briefErrors = Object.entries(errors).filter(([k]) => k.startsWith('structured_brief'));

    return (
        <div className="space-y-4 rounded-2xl border border-white/[0.11] bg-white/[0.035] p-4">
            {/* Section Header + Format Selector */}
            <div className="flex flex-col gap-3 border-b border-white/[0.09] pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="font-display text-sm font-bold text-[#F4F7FF]">
                        Content Brief Builder
                    </h3>
                    <p className="text-[11px] text-[#A7B4CB]">
                        Select a content format to configure its structured production brief.
                    </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {CONTENT_FORMATS.map((fmt) => {
                        const Icon = FORMAT_ICONS[fmt];
                        const isActive = activeFormat === fmt;
                        return (
                            <button
                                key={fmt}
                                type="button"
                                disabled={disabled}
                                onClick={() => handleFormatSwitch(fmt)}
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                                    isActive
                                        ? 'border-[#668CFF]/60 bg-gradient-to-r from-[#668CFF]/25 to-[#45D8E8]/15 text-[#F4F7FF] shadow-[0_0_16px_rgba(102,140,255,0.2)]'
                                        : 'border-white/[0.1] bg-white/[0.04] text-[#A7B4CB] hover:bg-white/[0.08] hover:text-[#F4F7FF]'
                                } disabled:opacity-50`}
                            >
                                <Icon className="h-3.5 w-3.5 text-[#45D8E8]" />
                                {fmt}
                            </button>
                        );
                    })}
                </div>
            </div>

            {briefErrors.length > 0 && (
                <div className="rounded-xl border border-[#F07183]/40 bg-[#F07183]/10 px-3 py-2 text-xs text-[#F9B4BE]">
                    {briefErrors[0][1]}
                </div>
            )}

            {/* 1. CAROUSEL BUILDER */}
            {activeFormat === 'Carousel' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className="text-xs font-semibold text-[#A7B4CB]">
                                Canvas Size / Aspect Ratio
                            </label>
                            <input
                                type="text"
                                disabled={disabled}
                                value={brief.canvas_size ?? '1080 × 1350 px'}
                                onChange={(e) =>
                                    onChange({ ...brief, format: 'Carousel', canvas_size: e.target.value })
                                }
                                placeholder="1080 × 1350 px (4:5)"
                                className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-[#A7B4CB]">
                                Overall Visual Direction
                            </label>
                            <input
                                type="text"
                                disabled={disabled}
                                value={brief.visual_direction ?? ''}
                                onChange={(e) =>
                                    onChange({
                                        ...brief,
                                        format: 'Carousel',
                                        visual_direction: e.target.value,
                                    })
                                }
                                placeholder="Dark navy + cyan glassmorphic aesthetic, clean sans typography"
                                className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#F4F7FF]">Slides</span>
                            <span className="rounded-full border border-[#668CFF]/35 bg-[#668CFF]/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#8DA8FF]">
                                {(brief.slides ?? []).length} slide{(brief.slides ?? []).length === 1 ? '' : 's'}
                            </span>
                        </div>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() =>
                                    updateSlides([
                                        ...(brief.slides ?? []),
                                        createEmptySlide((brief.slides ?? []).length + 1),
                                    ])
                                }
                                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#668CFF] to-[#45D8E8] px-3 py-1.5 text-xs font-semibold text-[#070B16] transition hover:brightness-110"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Slide
                            </button>
                        )}
                    </div>

                    {(brief.slides ?? []).length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/[0.16] bg-white/[0.02] p-6 text-center">
                            <Layers className="mx-auto mb-2 h-6 w-6 text-[#668CFF]" />
                            <p className="text-xs font-semibold text-[#F4F7FF]">No slides added yet</p>
                            <p className="mt-0.5 text-[11px] text-[#71819C]">
                                Add at least one slide to structure this Carousel brief.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {(brief.slides ?? []).map((slide, idx) => {
                                const isCollapsed = !!collapsedKeys[idx];
                                return (
                                    <div
                                        key={idx}
                                        className="rounded-xl border border-white/[0.11] bg-[#0B1222]/75 p-3.5"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <button
                                                type="button"
                                                onClick={() => toggleCollapse(idx)}
                                                className="flex items-center gap-2 text-left"
                                            >
                                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#668CFF]/20 font-mono text-xs font-bold text-[#8DA8FF]">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-xs font-bold text-[#F4F7FF]">
                                                    {slide.headline || `Slide ${idx + 1}`}
                                                </span>
                                                <span className="rounded-md border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[10px] text-[#45D8E8]">
                                                    {slide.role}
                                                </span>
                                                {isCollapsed ? (
                                                    <ChevronDown className="h-3.5 w-3.5 text-[#71819C]" />
                                                ) : (
                                                    <ChevronUp className="h-3.5 w-3.5 text-[#71819C]" />
                                                )}
                                            </button>

                                            {!disabled && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateSlides(moveItem(brief.slides ?? [], idx, -1))}
                                                        disabled={idx === 0}
                                                        title="Move Up"
                                                        className="rounded-lg p-1 text-[#A7B4CB] hover:bg-white/[0.08] disabled:opacity-30"
                                                    >
                                                        <ArrowUp className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateSlides(moveItem(brief.slides ?? [], idx, 1))}
                                                        disabled={idx === (brief.slides ?? []).length - 1}
                                                        title="Move Down"
                                                        className="rounded-lg p-1 text-[#A7B4CB] hover:bg-white/[0.08] disabled:opacity-30"
                                                    >
                                                        <ArrowDown className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const copy = [...(brief.slides ?? [])];
                                                            copy.splice(idx + 1, 0, { ...slide });
                                                            updateSlides(copy);
                                                        }}
                                                        title="Duplicate Slide"
                                                        className="rounded-lg p-1 text-[#A7B4CB] hover:bg-white/[0.08]"
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateSlides(
                                                                (brief.slides ?? []).filter((_, i) => i !== idx),
                                                            )
                                                        }
                                                        title="Delete Slide"
                                                        className="rounded-lg p-1 text-[#F07183] hover:bg-[#F07183]/15"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {!isCollapsed && (
                                            <div className="mt-3 grid grid-cols-1 gap-3 border-t border-white/[0.08] pt-3 sm:grid-cols-2">
                                                <div>
                                                    <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                        Slide Role / Structure *
                                                    </label>
                                                    <select
                                                        disabled={disabled}
                                                        value={slide.role}
                                                        onChange={(e) => {
                                                            const copy = [...(brief.slides ?? [])];
                                                            copy[idx] = { ...slide, role: e.target.value };
                                                            updateSlides(copy);
                                                        }}
                                                        className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                    >
                                                        {SLIDE_ROLES.map((r) => (
                                                            <option key={r} value={r}>
                                                                {r}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                        Headline / Main Copy *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        disabled={disabled}
                                                        value={slide.headline}
                                                        onChange={(e) => {
                                                            const copy = [...(brief.slides ?? [])];
                                                            copy[idx] = { ...slide, headline: e.target.value };
                                                            updateSlides(copy);
                                                        }}
                                                        placeholder="Main headline for this slide"
                                                        className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                        Supporting Content
                                                    </label>
                                                    <textarea
                                                        rows={2}
                                                        disabled={disabled}
                                                        value={slide.supporting_content}
                                                        onChange={(e) => {
                                                            const copy = [...(brief.slides ?? [])];
                                                            copy[idx] = {
                                                                ...slide,
                                                                supporting_content: e.target.value,
                                                            };
                                                            updateSlides(copy);
                                                        }}
                                                        placeholder="Body points, data, or explanation..."
                                                        className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                        Visual Direction *
                                                    </label>
                                                    <textarea
                                                        rows={2}
                                                        required
                                                        disabled={disabled}
                                                        value={slide.visual_direction}
                                                        onChange={(e) => {
                                                            const copy = [...(brief.slides ?? [])];
                                                            copy[idx] = {
                                                                ...slide,
                                                                visual_direction: e.target.value,
                                                            };
                                                            updateSlides(copy);
                                                        }}
                                                        placeholder="Layout, UI mockup, icons, color emphasis..."
                                                        className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                        Reference Image URL (optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        disabled={disabled}
                                                        value={slide.reference_image}
                                                        onChange={(e) => {
                                                            const copy = [...(brief.slides ?? [])];
                                                            copy[idx] = {
                                                                ...slide,
                                                                reference_image: e.target.value,
                                                            };
                                                            updateSlides(copy);
                                                        }}
                                                        placeholder="https://..."
                                                        className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                        Additional Notes (optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        disabled={disabled}
                                                        value={slide.notes}
                                                        onChange={(e) => {
                                                            const copy = [...(brief.slides ?? [])];
                                                            copy[idx] = { ...slide, notes: e.target.value };
                                                            updateSlides(copy);
                                                        }}
                                                        className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* 2. SINGLE IMAGE BUILDER */}
            {activeFormat === 'Single Image' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-[#A7B4CB]">Main Headline *</label>
                        <input
                            type="text"
                            required
                            disabled={disabled}
                            value={brief.headline ?? ''}
                            onChange={(e) =>
                                onChange({ ...brief, format: 'Single Image', headline: e.target.value })
                            }
                            placeholder="Primary bold headline on the graphic"
                            className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-[#A7B4CB]">Main Message *</label>
                        <textarea
                            rows={2}
                            required
                            disabled={disabled}
                            value={brief.main_message ?? ''}
                            onChange={(e) =>
                                onChange({ ...brief, format: 'Single Image', main_message: e.target.value })
                            }
                            placeholder="Core takeaway for the audience"
                            className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-[#A7B4CB]">Supporting Information</label>
                        <textarea
                            rows={2}
                            disabled={disabled}
                            value={brief.supporting_info ?? ''}
                            onChange={(e) =>
                                onChange({
                                    ...brief,
                                    format: 'Single Image',
                                    supporting_info: e.target.value,
                                })
                            }
                            placeholder="Sub-copy, bullet points, or stats"
                            className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-[#A7B4CB]">Call to Action (CTA)</label>
                        <input
                            type="text"
                            disabled={disabled}
                            value={brief.cta ?? ''}
                            onChange={(e) =>
                                onChange({ ...brief, format: 'Single Image', cta: e.target.value })
                            }
                            placeholder="DM 'KREVIA' or visit link in bio"
                            className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-[#A7B4CB]">Canvas Size</label>
                        <input
                            type="text"
                            disabled={disabled}
                            value={brief.canvas_size ?? '1080 × 1350 px'}
                            onChange={(e) =>
                                onChange({ ...brief, format: 'Single Image', canvas_size: e.target.value })
                            }
                            className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-[#A7B4CB]">Visual Direction *</label>
                        <textarea
                            rows={2}
                            required
                            disabled={disabled}
                            value={brief.visual_direction ?? ''}
                            onChange={(e) =>
                                onChange({
                                    ...brief,
                                    format: 'Single Image',
                                    visual_direction: e.target.value,
                                })
                            }
                            placeholder="Composition, focal visual, typography hierarchy, brand accents"
                            className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-[#A7B4CB]">Additional Notes</label>
                        <input
                            type="text"
                            disabled={disabled}
                            value={brief.notes ?? ''}
                            onChange={(e) =>
                                onChange({ ...brief, format: 'Single Image', notes: e.target.value })
                            }
                            className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                        />
                    </div>
                </div>
            )}

            {/* 3. REELS & 4. VIDEO BUILDERS */}
            {(activeFormat === 'Reels' || activeFormat === 'Video') && (
                <div className="space-y-4">
                    {activeFormat === 'Reels' ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="text-xs font-semibold text-[#A7B4CB]">Aspect Ratio</label>
                                <input
                                    type="text"
                                    disabled={disabled}
                                    value={brief.aspect_ratio ?? '9:16'}
                                    onChange={(e) =>
                                        onChange({ ...brief, format: 'Reels', aspect_ratio: e.target.value })
                                    }
                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#A7B4CB]">Target Duration</label>
                                <input
                                    type="text"
                                    disabled={disabled}
                                    value={brief.target_duration ?? '30–45s'}
                                    onChange={(e) =>
                                        onChange({
                                            ...brief,
                                            format: 'Reels',
                                            target_duration: e.target.value,
                                        })
                                    }
                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#A7B4CB]">
                                    Background Music Reference
                                </label>
                                <input
                                    type="text"
                                    disabled={disabled}
                                    value={brief.music_reference ?? ''}
                                    onChange={(e) =>
                                        onChange({
                                            ...brief,
                                            format: 'Reels',
                                            music_reference: e.target.value,
                                        })
                                    }
                                    placeholder="Upbeat corporate lo-fi / trending audio link"
                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#A7B4CB]">
                                    Overall Visual Style
                                </label>
                                <input
                                    type="text"
                                    disabled={disabled}
                                    value={brief.visual_style ?? ''}
                                    onChange={(e) =>
                                        onChange({ ...brief, format: 'Reels', visual_style: e.target.value })
                                    }
                                    placeholder="Fast cuts, clean subtitles, dark UI screen recordings"
                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="text-xs font-semibold text-[#A7B4CB]">Opening / Hook *</label>
                                <input
                                    type="text"
                                    required
                                    disabled={disabled}
                                    value={brief.hook ?? ''}
                                    onChange={(e) =>
                                        onChange({ ...brief, format: 'Video', hook: e.target.value })
                                    }
                                    placeholder="First 3–5 seconds hook"
                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#A7B4CB]">Video Duration</label>
                                <input
                                    type="text"
                                    disabled={disabled}
                                    value={brief.duration ?? '60s'}
                                    onChange={(e) =>
                                        onChange({ ...brief, format: 'Video', duration: e.target.value })
                                    }
                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#A7B4CB]">Aspect Ratio</label>
                                <input
                                    type="text"
                                    disabled={disabled}
                                    value={brief.aspect_ratio ?? '16:9'}
                                    onChange={(e) =>
                                        onChange({ ...brief, format: 'Video', aspect_ratio: e.target.value })
                                    }
                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-xs font-semibold text-[#A7B4CB]">Narration / Script</label>
                                <textarea
                                    rows={2}
                                    disabled={disabled}
                                    value={brief.narration ?? ''}
                                    onChange={(e) =>
                                        onChange({ ...brief, format: 'Video', narration: e.target.value })
                                    }
                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-xs font-semibold text-[#A7B4CB]">
                                    Visual Direction *
                                </label>
                                <textarea
                                    rows={2}
                                    required
                                    disabled={disabled}
                                    value={brief.visual_direction ?? ''}
                                    onChange={(e) =>
                                        onChange({
                                            ...brief,
                                            format: 'Video',
                                            visual_direction: e.target.value,
                                        })
                                    }
                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#A7B4CB]">Closing / CTA</label>
                                <input
                                    type="text"
                                    disabled={disabled}
                                    value={brief.closing_cta ?? ''}
                                    onChange={(e) =>
                                        onChange({ ...brief, format: 'Video', closing_cta: e.target.value })
                                    }
                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-[#A7B4CB]">Additional Notes</label>
                                <input
                                    type="text"
                                    disabled={disabled}
                                    value={brief.notes ?? ''}
                                    onChange={(e) =>
                                        onChange({ ...brief, format: 'Video', notes: e.target.value })
                                    }
                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                />
                            </div>
                        </div>
                    )}

                    {/* Scene Breakdown */}
                    <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#F4F7FF]">Scene Breakdown</span>
                            <span className="rounded-full border border-[#A17AFF]/35 bg-[#A17AFF]/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#A17AFF]">
                                {(brief.scenes ?? []).length} scene{(brief.scenes ?? []).length === 1 ? '' : 's'}
                            </span>
                        </div>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() =>
                                    updateScenes([
                                        ...(brief.scenes ?? []),
                                        createEmptyScene((brief.scenes ?? []).length + 1),
                                    ])
                                }
                                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#668CFF] to-[#A17AFF] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Scene
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {(brief.scenes ?? []).map((scene, idx) => {
                            const isCollapsed = !!collapsedKeys[idx];
                            return (
                                <div
                                    key={idx}
                                    className="rounded-xl border border-white/[0.11] bg-[#0B1222]/75 p-3.5"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => toggleCollapse(idx)}
                                            className="flex items-center gap-2 text-left"
                                        >
                                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#A17AFF]/20 font-mono text-xs font-bold text-[#A17AFF]">
                                                {idx + 1}
                                            </span>
                                            <span className="text-xs font-bold text-[#F4F7FF]">
                                                {scene.title || `Scene ${idx + 1}`}
                                            </span>
                                            {scene.duration && (
                                                <span className="rounded-md border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] text-[#45D8E8]">
                                                    {scene.duration}
                                                </span>
                                            )}
                                            {isCollapsed ? (
                                                <ChevronDown className="h-3.5 w-3.5 text-[#71819C]" />
                                            ) : (
                                                <ChevronUp className="h-3.5 w-3.5 text-[#71819C]" />
                                            )}
                                        </button>

                                        {!disabled && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => updateScenes(moveItem(brief.scenes ?? [], idx, -1))}
                                                    disabled={idx === 0}
                                                    className="rounded-lg p-1 text-[#A7B4CB] hover:bg-white/[0.08] disabled:opacity-30"
                                                >
                                                    <ArrowUp className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateScenes(moveItem(brief.scenes ?? [], idx, 1))}
                                                    disabled={idx === (brief.scenes ?? []).length - 1}
                                                    className="rounded-lg p-1 text-[#A7B4CB] hover:bg-white/[0.08] disabled:opacity-30"
                                                >
                                                    <ArrowDown className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const copy = [...(brief.scenes ?? [])];
                                                        copy.splice(idx + 1, 0, { ...scene });
                                                        updateScenes(copy);
                                                    }}
                                                    className="rounded-lg p-1 text-[#A7B4CB] hover:bg-white/[0.08]"
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateScenes(
                                                            (brief.scenes ?? []).filter((_, i) => i !== idx),
                                                        )
                                                    }
                                                    className="rounded-lg p-1 text-[#F07183] hover:bg-[#F07183]/15"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {!isCollapsed && (
                                        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-white/[0.08] pt-3 sm:grid-cols-2">
                                            <div>
                                                <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                    Scene Title *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    disabled={disabled}
                                                    value={scene.title}
                                                    onChange={(e) => {
                                                        const copy = [...(brief.scenes ?? [])];
                                                        copy[idx] = { ...scene, title: e.target.value };
                                                        updateScenes(copy);
                                                    }}
                                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                    Duration
                                                </label>
                                                <input
                                                    type="text"
                                                    disabled={disabled}
                                                    value={scene.duration}
                                                    onChange={(e) => {
                                                        const copy = [...(brief.scenes ?? [])];
                                                        copy[idx] = { ...scene, duration: e.target.value };
                                                        updateScenes(copy);
                                                    }}
                                                    placeholder="e.g. 5s"
                                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                    Visual Direction *
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    required
                                                    disabled={disabled}
                                                    value={scene.visual_direction}
                                                    onChange={(e) => {
                                                        const copy = [...(brief.scenes ?? [])];
                                                        copy[idx] = {
                                                            ...scene,
                                                            visual_direction: e.target.value,
                                                        };
                                                        updateScenes(copy);
                                                    }}
                                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                    On-Screen Text
                                                </label>
                                                <input
                                                    type="text"
                                                    disabled={disabled}
                                                    value={scene.on_screen_text}
                                                    onChange={(e) => {
                                                        const copy = [...(brief.scenes ?? [])];
                                                        copy[idx] = {
                                                            ...scene,
                                                            on_screen_text: e.target.value,
                                                        };
                                                        updateScenes(copy);
                                                    }}
                                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                    Transition / Effect
                                                </label>
                                                <input
                                                    type="text"
                                                    disabled={disabled}
                                                    value={scene.transition}
                                                    onChange={(e) => {
                                                        const copy = [...(brief.scenes ?? [])];
                                                        copy[idx] = { ...scene, transition: e.target.value };
                                                        updateScenes(copy);
                                                    }}
                                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                    Voice-over / Narration
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    disabled={disabled}
                                                    value={scene.voice_over}
                                                    onChange={(e) => {
                                                        const copy = [...(brief.scenes ?? [])];
                                                        copy[idx] = { ...scene, voice_over: e.target.value };
                                                        updateScenes(copy);
                                                    }}
                                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                    Additional Notes
                                                </label>
                                                <input
                                                    type="text"
                                                    disabled={disabled}
                                                    value={scene.notes}
                                                    onChange={(e) => {
                                                        const copy = [...(brief.scenes ?? [])];
                                                        copy[idx] = { ...scene, notes: e.target.value };
                                                        updateScenes(copy);
                                                    }}
                                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 5. STORY BUILDER */}
            {activeFormat === 'Story' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#F4F7FF]">Story Frames</span>
                            <span className="rounded-full border border-[#42C99A]/35 bg-[#42C99A]/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#42C99A]">
                                {(brief.frames ?? []).length} frame{(brief.frames ?? []).length === 1 ? '' : 's'}
                            </span>
                        </div>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() =>
                                    updateFrames([
                                        ...(brief.frames ?? []),
                                        createEmptyFrame((brief.frames ?? []).length + 1),
                                    ])
                                }
                                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#42C99A] to-[#45D8E8] px-3 py-1.5 text-xs font-semibold text-[#070B16] transition hover:brightness-110"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Frame
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {(brief.frames ?? []).map((frame, idx) => {
                            const isCollapsed = !!collapsedKeys[idx];
                            return (
                                <div
                                    key={idx}
                                    className="rounded-xl border border-white/[0.11] bg-[#0B1222]/75 p-3.5"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => toggleCollapse(idx)}
                                            className="flex items-center gap-2 text-left"
                                        >
                                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#42C99A]/20 font-mono text-xs font-bold text-[#42C99A]">
                                                {idx + 1}
                                            </span>
                                            <span className="text-xs font-bold text-[#F4F7FF]">
                                                {frame.headline || `Frame ${idx + 1}`}
                                            </span>
                                            {frame.interactive_element && frame.interactive_element !== 'None' && (
                                                <span className="rounded-md border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[10px] text-[#F4B860]">
                                                    {frame.interactive_element}
                                                </span>
                                            )}
                                            {isCollapsed ? (
                                                <ChevronDown className="h-3.5 w-3.5 text-[#71819C]" />
                                            ) : (
                                                <ChevronUp className="h-3.5 w-3.5 text-[#71819C]" />
                                            )}
                                        </button>

                                        {!disabled && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => updateFrames(moveItem(brief.frames ?? [], idx, -1))}
                                                    disabled={idx === 0}
                                                    className="rounded-lg p-1 text-[#A7B4CB] hover:bg-white/[0.08] disabled:opacity-30"
                                                >
                                                    <ArrowUp className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => updateFrames(moveItem(brief.frames ?? [], idx, 1))}
                                                    disabled={idx === (brief.frames ?? []).length - 1}
                                                    className="rounded-lg p-1 text-[#A7B4CB] hover:bg-white/[0.08] disabled:opacity-30"
                                                >
                                                    <ArrowDown className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const copy = [...(brief.frames ?? [])];
                                                        copy.splice(idx + 1, 0, { ...frame });
                                                        updateFrames(copy);
                                                    }}
                                                    className="rounded-lg p-1 text-[#A7B4CB] hover:bg-white/[0.08]"
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateFrames(
                                                            (brief.frames ?? []).filter((_, i) => i !== idx),
                                                        )
                                                    }
                                                    className="rounded-lg p-1 text-[#F07183] hover:bg-[#F07183]/15"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {!isCollapsed && (
                                        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-white/[0.08] pt-3 sm:grid-cols-2">
                                            <div>
                                                <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                    Frame Headline *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    disabled={disabled}
                                                    value={frame.headline}
                                                    onChange={(e) => {
                                                        const copy = [...(brief.frames ?? [])];
                                                        copy[idx] = { ...frame, headline: e.target.value };
                                                        updateFrames(copy);
                                                    }}
                                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                    Interactive Element
                                                </label>
                                                <select
                                                    disabled={disabled}
                                                    value={frame.interactive_element}
                                                    onChange={(e) => {
                                                        const copy = [...(brief.frames ?? [])];
                                                        copy[idx] = {
                                                            ...frame,
                                                            interactive_element: e.target.value,
                                                        };
                                                        updateFrames(copy);
                                                    }}
                                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                >
                                                    {STORY_INTERACTIVE_ELEMENTS.map((el) => (
                                                        <option key={el} value={el}>
                                                            {el}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                    Main Text
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    disabled={disabled}
                                                    value={frame.main_text}
                                                    onChange={(e) => {
                                                        const copy = [...(brief.frames ?? [])];
                                                        copy[idx] = { ...frame, main_text: e.target.value };
                                                        updateFrames(copy);
                                                    }}
                                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                    Visual Direction *
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    required
                                                    disabled={disabled}
                                                    value={frame.visual_direction}
                                                    onChange={(e) => {
                                                        const copy = [...(brief.frames ?? [])];
                                                        copy[idx] = {
                                                            ...frame,
                                                            visual_direction: e.target.value,
                                                        };
                                                        updateFrames(copy);
                                                    }}
                                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                    CTA
                                                </label>
                                                <input
                                                    type="text"
                                                    disabled={disabled}
                                                    value={frame.cta}
                                                    onChange={(e) => {
                                                        const copy = [...(brief.frames ?? [])];
                                                        copy[idx] = { ...frame, cta: e.target.value };
                                                        updateFrames(copy);
                                                    }}
                                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-[#A7B4CB]">
                                                    Additional Notes
                                                </label>
                                                <input
                                                    type="text"
                                                    disabled={disabled}
                                                    value={frame.notes}
                                                    onChange={(e) => {
                                                        const copy = [...(brief.frames ?? [])];
                                                        copy[idx] = { ...frame, notes: e.target.value };
                                                        updateFrames(copy);
                                                    }}
                                                    className="mt-1 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Optional Legacy / Summary Brief Field */}
            {onLegacyBriefChange && (
                <div className="border-t border-white/[0.08] pt-3">
                    <button
                        type="button"
                        onClick={() => setShowLegacyNotes((v) => !v)}
                        className="text-[11px] font-semibold text-[#71819C] hover:text-[#A7B4CB]"
                    >
                        {showLegacyNotes ? 'Hide' : 'Show'} General Brief Summary / Legacy Notes
                    </button>
                    {showLegacyNotes && (
                        <textarea
                            rows={2}
                            disabled={disabled}
                            value={legacyBrief ?? ''}
                            onChange={(e) => onLegacyBriefChange(e.target.value)}
                            placeholder="Optional overall brief summary..."
                            className="mt-2 w-full rounded-xl border border-white/[0.12] px-3 py-2 text-xs"
                        />
                    )}
                </div>
            )}
        </div>
    );
}

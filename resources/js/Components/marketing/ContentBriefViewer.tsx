import type { ContentFormat, StructuredBrief } from '@/Components/marketing/briefTypes';
import { ExternalLink, Film, Image as ImageIcon, Layers, Smartphone, Video } from 'lucide-react';

interface ContentBriefViewerProps {
    format?: ContentFormat | string | null;
    structuredBrief?: StructuredBrief | null;
    legacyBrief?: string | null;
}

export function ContentBriefViewer({
    format,
    structuredBrief,
    legacyBrief,
}: ContentBriefViewerProps) {
    if (!structuredBrief || !format) {
        return (
            <div className="rounded-xl border border-white/[0.09] bg-white/[0.03] p-4">
                <p className="text-[11px] font-bold tracking-wider text-[#71819C] uppercase">
                    Content Brief (Legacy)
                </p>
                <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-[#A7B4CB]">
                    {legacyBrief?.trim() || 'No content brief provided yet.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 rounded-2xl border border-white/[0.11] bg-white/[0.035] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.09] pb-3">
                <div className="flex items-center gap-2">
                    {format === 'Carousel' && <Layers className="h-4 w-4 text-[#668CFF]" />}
                    {format === 'Single Image' && <ImageIcon className="h-4 w-4 text-[#45D8E8]" />}
                    {format === 'Reels' && <Film className="h-4 w-4 text-[#A17AFF]" />}
                    {format === 'Video' && <Video className="h-4 w-4 text-[#F4B860]" />}
                    {format === 'Story' && <Smartphone className="h-4 w-4 text-[#42C99A]" />}
                    <h3 className="font-display text-sm font-bold text-[#F4F7FF]">
                        Structured Brief — {format}
                    </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    {structuredBrief.canvas_size && (
                        <span className="rounded-lg border border-white/[0.1] bg-white/[0.05] px-2.5 py-0.5 font-mono text-[#45D8E8]">
                            {structuredBrief.canvas_size}
                        </span>
                    )}
                    {structuredBrief.aspect_ratio && (
                        <span className="rounded-lg border border-white/[0.1] bg-white/[0.05] px-2.5 py-0.5 font-mono text-[#A17AFF]">
                            {structuredBrief.aspect_ratio}
                        </span>
                    )}
                    {(structuredBrief.target_duration || structuredBrief.duration) && (
                        <span className="rounded-lg border border-white/[0.1] bg-white/[0.05] px-2.5 py-0.5 font-mono text-[#42C99A]">
                            {structuredBrief.target_duration || structuredBrief.duration}
                        </span>
                    )}
                </div>
            </div>

            {/* CAROUSEL VIEW */}
            {format === 'Carousel' && (
                <div className="space-y-3">
                    {structuredBrief.visual_direction && (
                        <div className="rounded-xl border border-white/[0.09] bg-[#0B1222]/65 p-3 text-xs">
                            <p className="text-[10px] font-bold tracking-wider text-[#71819C] uppercase">
                                Overall Visual Direction
                            </p>
                            <p className="mt-1 text-[#F4F7FF]">{structuredBrief.visual_direction}</p>
                        </div>
                    )}
                    <div className="grid gap-3 md:grid-cols-2">
                        {(structuredBrief.slides ?? []).map((slide, idx) => (
                            <div
                                key={idx}
                                className="rounded-xl border border-white/[0.1] bg-[#0B1222]/80 p-3.5"
                            >
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#8DA8FF]">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#668CFF]/20">
                                            {slide.slide_number ?? idx + 1}
                                        </span>
                                        Slide {slide.slide_number ?? idx + 1}
                                    </span>
                                    <span className="rounded-md border border-[#45D8E8]/30 bg-[#45D8E8]/10 px-2 py-0.5 text-[10px] font-semibold text-[#45D8E8]">
                                        {slide.role}
                                    </span>
                                </div>
                                <p className="text-xs font-bold text-[#F4F7FF]">{slide.headline}</p>
                                {slide.supporting_content && (
                                    <p className="mt-1.5 whitespace-pre-line text-[11px] leading-relaxed text-[#A7B4CB]">
                                        {slide.supporting_content}
                                    </p>
                                )}
                                <div className="mt-2.5 border-t border-white/[0.08] pt-2 text-[11px]">
                                    <span className="font-semibold text-[#71819C]">Visual: </span>
                                    <span className="text-[#A7B4CB]">{slide.visual_direction}</span>
                                </div>
                                {slide.reference_image && (
                                    <a
                                        href={slide.reference_image}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#45D8E8] hover:underline"
                                    >
                                        Reference Image <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
                                {slide.notes && (
                                    <p className="mt-1 text-[10px] italic text-[#71819C]">Note: {slide.notes}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SINGLE IMAGE VIEW */}
            {format === 'Single Image' && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/[0.09] bg-[#0B1222]/70 p-3 sm:col-span-2">
                        <p className="text-[10px] font-bold tracking-wider text-[#71819C] uppercase">
                            Main Headline
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#F4F7FF]">{structuredBrief.headline}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.09] bg-[#0B1222]/70 p-3 sm:col-span-2">
                        <p className="text-[10px] font-bold tracking-wider text-[#71819C] uppercase">
                            Main Message
                        </p>
                        <p className="mt-1 whitespace-pre-line text-xs text-[#A7B4CB]">
                            {structuredBrief.main_message}
                        </p>
                    </div>
                    {structuredBrief.supporting_info && (
                        <div className="rounded-xl border border-white/[0.09] bg-[#0B1222]/70 p-3">
                            <p className="text-[10px] font-bold tracking-wider text-[#71819C] uppercase">
                                Supporting Information
                            </p>
                            <p className="mt-1 whitespace-pre-line text-xs text-[#A7B4CB]">
                                {structuredBrief.supporting_info}
                            </p>
                        </div>
                    )}
                    {structuredBrief.cta && (
                        <div className="rounded-xl border border-white/[0.09] bg-[#0B1222]/70 p-3">
                            <p className="text-[10px] font-bold tracking-wider text-[#71819C] uppercase">
                                Call to Action (CTA)
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[#42C99A]">{structuredBrief.cta}</p>
                        </div>
                    )}
                    <div className="rounded-xl border border-white/[0.09] bg-[#0B1222]/70 p-3 sm:col-span-2">
                        <p className="text-[10px] font-bold tracking-wider text-[#71819C] uppercase">
                            Visual Direction
                        </p>
                        <p className="mt-1 whitespace-pre-line text-xs text-[#A7B4CB]">
                            {structuredBrief.visual_direction}
                        </p>
                    </div>
                    {structuredBrief.notes && (
                        <div className="rounded-xl border border-white/[0.09] bg-[#0B1222]/70 p-3 sm:col-span-2">
                            <p className="text-[10px] font-bold tracking-wider text-[#71819C] uppercase">
                                Additional Notes
                            </p>
                            <p className="mt-1 text-xs text-[#A7B4CB]">{structuredBrief.notes}</p>
                        </div>
                    )}
                </div>
            )}

            {/* REELS & VIDEO VIEW */}
            {(format === 'Reels' || format === 'Video') && (
                <div className="space-y-3">
                    {format === 'Reels' && (structuredBrief.music_reference || structuredBrief.visual_style) && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {structuredBrief.music_reference && (
                                <div className="rounded-xl border border-white/[0.09] bg-[#0B1222]/70 p-3 text-xs">
                                    <p className="text-[10px] font-bold text-[#71819C] uppercase">Music Reference</p>
                                    <p className="mt-1 text-[#F4F7FF]">{structuredBrief.music_reference}</p>
                                </div>
                            )}
                            {structuredBrief.visual_style && (
                                <div className="rounded-xl border border-white/[0.09] bg-[#0B1222]/70 p-3 text-xs">
                                    <p className="text-[10px] font-bold text-[#71819C] uppercase">Visual Style</p>
                                    <p className="mt-1 text-[#F4F7FF]">{structuredBrief.visual_style}</p>
                                </div>
                            )}
                        </div>
                    )}
                    {format === 'Video' && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {structuredBrief.hook && (
                                <div className="rounded-xl border border-white/[0.09] bg-[#0B1222]/70 p-3 text-xs sm:col-span-2">
                                    <p className="text-[10px] font-bold text-[#71819C] uppercase">Opening / Hook</p>
                                    <p className="mt-1 font-semibold text-[#F4F7FF]">{structuredBrief.hook}</p>
                                </div>
                            )}
                            {structuredBrief.visual_direction && (
                                <div className="rounded-xl border border-white/[0.09] bg-[#0B1222]/70 p-3 text-xs sm:col-span-2">
                                    <p className="text-[10px] font-bold text-[#71819C] uppercase">Visual Direction</p>
                                    <p className="mt-1 text-[#A7B4CB]">{structuredBrief.visual_direction}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="space-y-2.5">
                        {(structuredBrief.scenes ?? []).map((scene, idx) => (
                            <div
                                key={idx}
                                className="rounded-xl border border-white/[0.1] bg-[#0B1222]/80 p-3.5"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-xs font-bold text-[#A17AFF]">
                                        Scene {scene.scene_number ?? idx + 1}: {scene.title}
                                    </span>
                                    {scene.duration && (
                                        <span className="rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-[#45D8E8]">
                                            {scene.duration}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1.5 text-xs text-[#A7B4CB]">{scene.visual_direction}</p>
                                {scene.on_screen_text && (
                                    <p className="mt-1 text-[11px] text-[#F4F7FF]">
                                        <span className="text-[#71819C]">On-Screen: </span>
                                        {scene.on_screen_text}
                                    </p>
                                )}
                                {scene.voice_over && (
                                    <p className="mt-1 text-[11px] text-[#A7B4CB]">
                                        <span className="text-[#71819C]">VO: </span>
                                        {scene.voice_over}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* STORY VIEW */}
            {format === 'Story' && (
                <div className="grid gap-3 md:grid-cols-2">
                    {(structuredBrief.frames ?? []).map((frame, idx) => (
                        <div
                            key={idx}
                            className="rounded-xl border border-white/[0.1] bg-[#0B1222]/80 p-3.5"
                        >
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                <span className="font-mono text-xs font-bold text-[#42C99A]">
                                    Frame {frame.frame_number ?? idx + 1}
                                </span>
                                {frame.interactive_element && frame.interactive_element !== 'None' && (
                                    <span className="rounded-md bg-[#F4B860]/15 px-2 py-0.5 text-[10px] font-semibold text-[#F4B860]">
                                        {frame.interactive_element}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs font-bold text-[#F4F7FF]">{frame.headline}</p>
                            {frame.main_text && (
                                <p className="mt-1 text-[11px] text-[#A7B4CB]">{frame.main_text}</p>
                            )}
                            <p className="mt-2 border-t border-white/[0.08] pt-1.5 text-[11px] text-[#A7B4CB]">
                                <span className="text-[#71819C]">Visual: </span>
                                {frame.visual_direction}
                            </p>
                            {frame.cta && (
                                <p className="mt-1 text-[11px] font-semibold text-[#42C99A]">CTA: {frame.cta}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

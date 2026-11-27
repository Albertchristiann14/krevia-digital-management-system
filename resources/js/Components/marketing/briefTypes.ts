export type ContentFormat = 'Single Image' | 'Carousel' | 'Reels' | 'Video' | 'Story';

export const CONTENT_FORMATS: ContentFormat[] = [
    'Single Image',
    'Carousel',
    'Reels',
    'Video',
    'Story',
];

export const SLIDE_ROLES = [
    'Cover / Hook',
    'Context',
    'Main Explanation',
    'Insight',
    'Data / Supporting Information',
    'Conclusion',
    'CTA / Closing',
] as const;

export const STORY_INTERACTIVE_ELEMENTS = [
    'None',
    'Poll',
    'Question',
    'Link',
    'Quiz',
    'Emoji Slider',
] as const;

export interface CarouselSlide {
    slide_number: number;
    role: string;
    headline: string;
    supporting_content: string;
    visual_direction: string;
    reference_image: string;
    notes: string;
}

export interface VideoScene {
    scene_number: number;
    title: string;
    duration: string;
    visual_direction: string;
    on_screen_text: string;
    voice_over: string;
    transition: string;
    notes: string;
}

export interface StoryFrame {
    frame_number: number;
    headline: string;
    main_text: string;
    visual_direction: string;
    interactive_element: string;
    cta: string;
    notes: string;
}

export interface StructuredBrief {
    format?: ContentFormat;
    // Carousel
    canvas_size?: string;
    visual_direction?: string;
    slides?: CarouselSlide[];
    // Single Image
    headline?: string;
    main_message?: string;
    supporting_info?: string;
    cta?: string;
    notes?: string;
    // Reels & Video
    aspect_ratio?: string;
    target_duration?: string;
    music_reference?: string;
    visual_style?: string;
    hook?: string;
    narration?: string;
    closing_cta?: string;
    duration?: string;
    scenes?: VideoScene[];
    // Story
    frames?: StoryFrame[];
}

export function suggestFormatForPlatform(platform: string): ContentFormat {
    if (platform === 'Instagram Reels' || platform === 'TikTok') return 'Reels';
    if (platform === 'Instagram Story') return 'Story';
    if (platform === 'LinkedIn') return 'Single Image';
    return 'Carousel';
}

export function createEmptySlide(num = 1): CarouselSlide {
    return {
        slide_number: num,
        role: num === 1 ? 'Cover / Hook' : 'Main Explanation',
        headline: '',
        supporting_content: '',
        visual_direction: '',
        reference_image: '',
        notes: '',
    };
}

export function createEmptyScene(num = 1): VideoScene {
    return {
        scene_number: num,
        title: num === 1 ? 'Opening Hook' : `Scene ${num}`,
        duration: '5s',
        visual_direction: '',
        on_screen_text: '',
        voice_over: '',
        transition: '',
        notes: '',
    };
}

export function createEmptyFrame(num = 1): StoryFrame {
    return {
        frame_number: num,
        headline: '',
        main_text: '',
        visual_direction: '',
        interactive_element: 'None',
        cta: '',
        notes: '',
    };
}

export function createDefaultStructuredBrief(format: ContentFormat): StructuredBrief {
    switch (format) {
        case 'Carousel':
            return {
                format: 'Carousel',
                canvas_size: '1080 × 1350 px',
                visual_direction: '',
                slides: [createEmptySlide(1)],
            };
        case 'Single Image':
            return {
                format: 'Single Image',
                headline: '',
                main_message: '',
                supporting_info: '',
                cta: '',
                visual_direction: '',
                canvas_size: '1080 × 1350 px',
                notes: '',
            };
        case 'Reels':
            return {
                format: 'Reels',
                aspect_ratio: '9:16',
                target_duration: '30–45s',
                music_reference: '',
                visual_style: '',
                scenes: [createEmptyScene(1)],
            };
        case 'Video':
            return {
                format: 'Video',
                hook: '',
                narration: '',
                visual_direction: '',
                closing_cta: '',
                duration: '60s',
                aspect_ratio: '16:9',
                notes: '',
                scenes: [createEmptyScene(1)],
            };
        case 'Story':
            return {
                format: 'Story',
                frames: [createEmptyFrame(1)],
            };
    }
}

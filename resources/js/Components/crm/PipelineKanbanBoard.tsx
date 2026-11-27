import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    closestCorners,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowUpRight,
    CalendarClock,
    CheckCircle2,
    GripVertical,
    Loader2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { UserAvatar } from '@/Components/shared/UserAvatar';
import { cn, formatShortDate } from '@/lib/utils';

export interface PipelineLeadRow {
    id: number;
    code: string;
    company_id: number;
    company_name: string | null;
    industry: string | null;
    website: string | null;
    contact_name: string | null;
    contact_role: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    potential_needs: string | null;
    service_line: string;
    source: string | null;
    stage: string;
    kanban_order?: number;
    pic_user_id: number | null;
    pic_name: string | null;
    pic_avatar_url?: string | null;
    pic_avatar_color?: string | null;
    contacted_at: string | null;
    next_follow_up_at: string | null;
    estimated_value: number | null;
    discovery_meeting_at: string | null;
    proposal_sent_at: string | null;
    closed_at: string | null;
    data_status: string;
    follow_up_overdue: boolean;
    converted_project: { id: number; code: string } | null;
}

interface PipelineKanbanBoardProps {
    leads: PipelineLeadRow[];
    stages: string[];
    stageTopBar: Record<string, string>;
    formatCurrency: (val: number | null) => string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function getCsrfToken(): string {
    if (typeof document === 'undefined') {
        return '';
    }
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta?.getAttribute('content')) {
        return meta.getAttribute('content') ?? '';
    }
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function PipelineCard({
    lead,
    formatCurrency,
    isOverlay = false,
}: {
    lead: PipelineLeadRow;
    formatCurrency: (val: number | null) => string;
    isOverlay?: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: lead.id,
        data: { stage: lead.stage },
        disabled: isOverlay,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={isOverlay ? undefined : setNodeRef}
            style={isOverlay ? undefined : style}
            {...(isOverlay ? {} : attributes)}
            {...(isOverlay ? {} : listeners)}
            className={cn(
                'group cursor-grab touch-none rounded-lg border border-slate-200 bg-white p-3 transition hover:border-[#101D35]/40 hover:shadow-xs active:cursor-grabbing dark:border-slate-800 dark:bg-[#162238] dark:hover:border-blue-500/40',
                isDragging && !isOverlay && 'opacity-40',
                isOverlay && 'rotate-1 shadow-xl ring-2 ring-blue-500/40',
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    <GripVertical className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {lead.code}
                    </span>
                </div>
                {lead.converted_project ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {lead.converted_project.code}
                    </span>
                ) : lead.data_status !== 'Disepakati' ? (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        Needs Confirm
                    </span>
                ) : null}
            </div>

            <Link
                href={`/crm/leads/${lead.id}`}
                draggable={false}
                className="mt-1.5 block text-sm font-semibold text-[#101D35] group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-400"
            >
                {lead.company_name}
            </Link>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lead.industry} • {lead.service_line}
            </p>
            {lead.potential_needs && (
                <p className="mt-1.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                    {lead.potential_needs}
                </p>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">
                <span className="font-medium text-slate-700 dark:text-slate-200">
                    {formatCurrency(lead.estimated_value)}
                </span>
                {lead.next_follow_up_at && (
                    <span
                        className={cn(
                            'inline-flex items-center gap-1 font-medium',
                            lead.follow_up_overdue
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-500 dark:text-slate-400',
                        )}
                    >
                        <CalendarClock className="h-3 w-3" />
                        {formatShortDate(lead.next_follow_up_at)}
                    </span>
                )}
            </div>

            <Link
                href={`/crm/leads/${lead.id}`}
                draggable={false}
                className="mt-2 flex items-center justify-between"
            >
                <div className="flex items-center gap-1.5">
                    <UserAvatar
                        name={lead.pic_name}
                        avatarUrl={lead.pic_avatar_url}
                        avatarColor={lead.pic_avatar_color}
                        size="xs"
                        className="h-5 w-5"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">
                        {lead.pic_name ?? 'Unassigned'}
                    </span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#101D35] dark:text-slate-500 dark:group-hover:text-blue-400" />
            </Link>
        </div>
    );
}

function PipelineColumn({
    stage,
    leads,
    topColor,
    formatCurrency,
}: {
    stage: string;
    leads: PipelineLeadRow[];
    topColor: string;
    formatCurrency: (val: number | null) => string;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `stage:${stage}`,
        data: { stage },
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'flex w-[285px] shrink-0 flex-col rounded-xl border border-t-4 border-slate-200 bg-slate-50/70 transition-colors dark:border-slate-800 dark:bg-[#0F172A]',
                topColor,
                isOver && 'ring-2 ring-blue-500/40',
            )}
        >
            <div className="flex items-center justify-between border-b border-slate-200/80 px-3 py-2.5 dark:border-slate-800">
                <h3 className="text-xs font-bold text-[#101D35] dark:text-slate-100">{stage}</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                    {leads.length}
                </span>
            </div>

            <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                <div className="flex max-h-[68vh] min-h-[120px] flex-1 flex-col gap-2.5 overflow-y-auto p-2.5">
                    {leads.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-100/60 px-3 py-6 text-center text-[11px] text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500">
                            Drop prospect here
                        </div>
                    ) : (
                        leads.map((lead) => (
                            <PipelineCard
                                key={lead.id}
                                lead={lead}
                                formatCurrency={formatCurrency}
                            />
                        ))
                    )}
                </div>
            </SortableContext>
        </div>
    );
}

export function PipelineKanbanBoard({
    leads,
    stages,
    stageTopBar,
    formatCurrency,
}: PipelineKanbanBoardProps) {
    const [boardLeads, setBoardLeads] = useState<PipelineLeadRow[]>(leads);
    const [activeLeadId, setActiveLeadId] = useState<number | null>(null);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        setBoardLeads(leads);
    }, [leads]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
    );

    const activeLead = useMemo(
        () => boardLeads.find((l) => l.id === activeLeadId) ?? null,
        [boardLeads, activeLeadId],
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveLeadId(Number(event.active.id));
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveLeadId(null);
        const { active, over } = event;
        if (!over) {
            return;
        }

        const draggedId = Number(active.id);
        const draggedLead = boardLeads.find((l) => l.id === draggedId);
        if (!draggedLead) {
            return;
        }

        const overIdStr = String(over.id);
        let targetStage = draggedLead.stage;

        if (overIdStr.startsWith('stage:')) {
            targetStage = overIdStr.slice(6);
        } else {
            const overLead = boardLeads.find((l) => l.id === Number(over.id));
            if (overLead) {
                targetStage = overLead.stage;
            }
        }

        if (!stages.includes(targetStage)) {
            return;
        }

        const previousSnapshot = boardLeads;
        let nextLeads: PipelineLeadRow[] = [];
        let targetColumnIds: number[] = [];

        if (draggedLead.stage === targetStage) {
            if (overIdStr.startsWith('stage:') || Number(over.id) === draggedId) {
                return;
            }
            const colItems = boardLeads.filter((l) => l.stage === targetStage);
            const oldIndex = colItems.findIndex((l) => l.id === draggedId);
            const newIndex = colItems.findIndex((l) => l.id === Number(over.id));
            if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
                return;
            }
            const reorderedCol = arrayMove(colItems, oldIndex, newIndex);
            targetColumnIds = reorderedCol.map((l) => l.id);

            const others = boardLeads.filter((l) => l.stage !== targetStage);
            nextLeads = [...others, ...reorderedCol];
        } else {
            const updatedDragged: PipelineLeadRow = { ...draggedLead, stage: targetStage };
            const remaining = boardLeads.filter((l) => l.id !== draggedId);
            const destItems = remaining.filter((l) => l.stage === targetStage);

            if (!overIdStr.startsWith('stage:')) {
                const overIdx = destItems.findIndex((l) => l.id === Number(over.id));
                if (overIdx >= 0) {
                    destItems.splice(overIdx, 0, updatedDragged);
                } else {
                    destItems.push(updatedDragged);
                }
            } else {
                destItems.push(updatedDragged);
            }

            targetColumnIds = destItems.map((l) => l.id);
            const others = remaining.filter((l) => l.stage !== targetStage);
            nextLeads = [...others, ...destItems];
        }

        setBoardLeads(nextLeads);
        setSaveState('saving');
        setSaveError(null);

        try {
            const csrf = getCsrfToken();
            const response = await fetch('/crm/leads/reorder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf, 'X-XSRF-TOKEN': csrf } : {}),
                },
                body: JSON.stringify({
                    lead_id: draggedId,
                    stage: targetStage,
                    ordered_ids: targetColumnIds,
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.message ?? 'Failed to save pipeline change.');
            }

            setSaveState('saved');
            setTimeout(() => {
                setSaveState((prev) => (prev === 'saved' ? 'idle' : prev));
            }, 2500);
        } catch (err) {
            setBoardLeads(previousSnapshot);
            setSaveState('error');
            setSaveError(err instanceof Error ? err.message : 'Failed to save pipeline change.');
        }
    };

    return (
        <div className="mt-4 space-y-2.5">
            <div className="flex min-h-[26px] items-center justify-between gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Drag prospect cards between stages or reorder within a stage — changes save automatically.
                </p>

                {saveState === 'saving' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving...
                    </span>
                )}
                {saveState === 'saved' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Saved
                    </span>
                )}
                {saveState === 'error' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        <AlertCircle className="h-3 w-3" />
                        Failed to save{saveError ? `: ${saveError}` : ''}
                    </span>
                )}
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-3 overflow-x-auto pb-4">
                    {stages.map((stage) => (
                        <PipelineColumn
                            key={stage}
                            stage={stage}
                            leads={boardLeads.filter((l) => l.stage === stage)}
                            topColor={stageTopBar[stage] ?? 'border-t-slate-400'}
                            formatCurrency={formatCurrency}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeLead ? (
                        <PipelineCard
                            lead={activeLead}
                            formatCurrency={formatCurrency}
                            isOverlay
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

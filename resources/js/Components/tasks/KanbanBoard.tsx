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
import { AlertCircle, CheckCircle2, FileCheck2, GripVertical, Loader2, MessageSquare } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '@/Components/shared/StatusBadge';
import { UserAvatar } from '@/Components/shared/UserAvatar';
import { cn } from '@/lib/utils';
import type { TaskListItem } from '@/types';

interface KanbanBoardProps {
    tasks: TaskListItem[];
    statuses: string[];
    topColors: Record<string, string>;
    onQuickMove: (task: TaskListItem, nextStatus: string) => void;
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

function KanbanCard({
    task,
    statuses,
    onQuickMove,
    isOverlay = false,
}: {
    task: TaskListItem;
    statuses: string[];
    onQuickMove: (task: TaskListItem, nextStatus: string) => void;
    isOverlay?: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { status: task.status },
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
                'cursor-grab touch-none rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition active:cursor-grabbing dark:border-slate-800 dark:bg-[#162238]',
                isDragging && !isOverlay && 'opacity-40',
                isOverlay && 'rotate-1 shadow-xl ring-2 ring-blue-500/40',
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    <GripVertical className="h-3.5 w-3.5 text-slate-400" />
                    <Link
                        href={`/tasks/${task.id}`}
                        draggable={false}
                        className="font-mono text-[11px] font-bold text-[#101D35] hover:underline dark:text-blue-300"
                    >
                        {task.code}
                    </Link>
                </div>
                <StatusBadge label={task.priority} />
            </div>

            <Link
                href={`/tasks/${task.id}`}
                draggable={false}
                className="mt-1.5 block text-xs font-semibold text-slate-900 hover:text-blue-700 dark:text-slate-100 dark:hover:text-blue-400"
            >
                {task.title}
            </Link>

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-mono">{task.deadline}</span>
                <span className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-0.5">
                        <FileCheck2 className="h-3 w-3" /> {task.evidences_count}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                        <MessageSquare className="h-3 w-3" /> {task.comments_count}
                    </span>
                </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                <div className="flex min-w-0 items-center gap-1.5">
                    <UserAvatar
                        name={task.pic_name}
                        avatarUrl={(task as { pic_avatar_url?: string | null }).pic_avatar_url}
                        avatarColor={task.pic_avatar_color}
                        size="xs"
                        className="h-6 w-6"
                    />
                    <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {task.pic_name}
                    </span>
                </div>

                <select
                    value={task.status}
                    onPointerDown={(e) => e.stopPropagation()}
                    onChange={(e) => onQuickMove(task, e.target.value)}
                    className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                    {statuses.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

function KanbanColumn({
    status,
    tasks,
    statuses,
    topColor,
    onQuickMove,
}: {
    status: string;
    tasks: TaskListItem[];
    statuses: string[];
    topColor: string;
    onQuickMove: (task: TaskListItem, nextStatus: string) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `col:${status}`,
        data: { status },
    });

    const visibleTasks = tasks.slice(0, 30);

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'flex w-80 shrink-0 flex-col rounded-xl border border-slate-200 border-t-4 bg-slate-50/70 p-3 transition-colors dark:border-slate-800 dark:bg-[#0F172A]',
                topColor,
                isOver && 'ring-2 ring-blue-500/40',
            )}
        >
            <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-xs font-bold text-[#101D35] dark:text-slate-100">{status}</span>
                <span className="rounded-full bg-white px-2 py-0.5 font-mono text-xs font-semibold text-slate-600 shadow-2xs dark:bg-slate-800 dark:text-slate-300">
                    {tasks.length}
                </span>
            </div>

            <SortableContext items={visibleTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="max-h-[68vh] min-h-[120px] space-y-2.5 overflow-y-auto pr-1">
                    {visibleTasks.length === 0 ? (
                        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
                            Drop task here
                        </div>
                    ) : (
                        visibleTasks.map((t) => (
                            <KanbanCard
                                key={t.id}
                                task={t}
                                statuses={statuses}
                                onQuickMove={onQuickMove}
                            />
                        ))
                    )}
                </div>
            </SortableContext>
        </div>
    );
}

export function KanbanBoard({ tasks, statuses, topColors, onQuickMove }: KanbanBoardProps) {
    const [boardTasks, setBoardTasks] = useState<TaskListItem[]>(tasks);
    const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        setBoardTasks(tasks);
    }, [tasks]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
    );

    const activeTask = useMemo(
        () => boardTasks.find((t) => t.id === activeTaskId) ?? null,
        [boardTasks, activeTaskId],
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveTaskId(Number(event.active.id));
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveTaskId(null);
        const { active, over } = event;
        if (!over) {
            return;
        }

        const draggedId = Number(active.id);
        const draggedTask = boardTasks.find((t) => t.id === draggedId);
        if (!draggedTask) {
            return;
        }

        const overIdStr = String(over.id);
        let targetStatus = draggedTask.status;

        if (overIdStr.startsWith('col:')) {
            targetStatus = overIdStr.slice(4);
        } else {
            const overTask = boardTasks.find((t) => t.id === Number(over.id));
            if (overTask) {
                targetStatus = overTask.status;
            }
        }

        if (!statuses.includes(targetStatus)) {
            return;
        }

        const previousSnapshot = boardTasks;
        let nextTasks: TaskListItem[] = [];
        let targetColumnIds: number[] = [];

        if (draggedTask.status === targetStatus) {
            if (overIdStr.startsWith('col:') || Number(over.id) === draggedId) {
                return;
            }
            const colItems = boardTasks.filter((t) => t.status === targetStatus);
            const oldIndex = colItems.findIndex((t) => t.id === draggedId);
            const newIndex = colItems.findIndex((t) => t.id === Number(over.id));
            if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
                return;
            }
            const reorderedCol = arrayMove(colItems, oldIndex, newIndex);
            targetColumnIds = reorderedCol.map((t) => t.id);

            const others = boardTasks.filter((t) => t.status !== targetStatus);
            nextTasks = [...others, ...reorderedCol];
        } else {
            const updatedDragged: TaskListItem = { ...draggedTask, status: targetStatus };
            const remaining = boardTasks.filter((t) => t.id !== draggedId);
            const destItems = remaining.filter((t) => t.status === targetStatus);

            if (!overIdStr.startsWith('col:')) {
                const overIdx = destItems.findIndex((t) => t.id === Number(over.id));
                if (overIdx >= 0) {
                    destItems.splice(overIdx, 0, updatedDragged);
                } else {
                    destItems.push(updatedDragged);
                }
            } else {
                destItems.push(updatedDragged);
            }

            targetColumnIds = destItems.map((t) => t.id);
            const others = remaining.filter((t) => t.status !== targetStatus);
            nextTasks = [...others, ...destItems];
        }

        // Optimistic UI update
        setBoardTasks(nextTasks);
        setSaveState('saving');
        setSaveError(null);

        try {
            const csrf = getCsrfToken();
            const response = await fetch('/tasks/reorder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf, 'X-XSRF-TOKEN': csrf } : {}),
                },
                body: JSON.stringify({
                    task_id: draggedId,
                    status: targetStatus,
                    ordered_ids: targetColumnIds,
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.message ?? 'Failed to save Kanban change.');
            }

            setSaveState('saved');
            setTimeout(() => {
                setSaveState((prev) => (prev === 'saved' ? 'idle' : prev));
            }, 2500);
        } catch (err) {
            setBoardTasks(previousSnapshot);
            setSaveState('error');
            setSaveError(err instanceof Error ? err.message : 'Failed to save Kanban change.');
        }
    };

    return (
        <div className="space-y-3">
            {/* Auto-Save Status Bar */}
            <div className="flex min-h-[28px] items-center justify-between gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Drag cards between columns or reorder within a column — changes save automatically.
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
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {statuses.map((colStatus) => (
                        <KanbanColumn
                            key={colStatus}
                            status={colStatus}
                            tasks={boardTasks.filter((t) => t.status === colStatus)}
                            statuses={statuses}
                            topColor={topColors[colStatus] ?? 'border-t-slate-400'}
                            onQuickMove={onQuickMove}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeTask ? (
                        <KanbanCard
                            task={activeTask}
                            statuses={statuses}
                            onQuickMove={onQuickMove}
                            isOverlay
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

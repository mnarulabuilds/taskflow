'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import { ActivityFeed } from '@/components/activity-feed';
import { AppShell } from '@/components/app-shell';
import { CalendarView } from '@/components/calendar-view';
import { EditProjectModal } from '@/components/edit-project-modal';
import { KanbanColumnSkeleton } from '@/components/skeleton';
import { ListView } from '@/components/list-view';
import { LoadingScreen } from '@/components/loading-screen';
import { TaskDetailModal } from '@/components/task-detail-modal';
import {
  TaskFilters,
  TaskFiltersState,
} from '@/components/task-filters';
import { useToast } from '@/components/toast-provider';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  tasksQueryKey,
  useFavorites,
  useProject,
  useTask,
  useTasks,
} from '@/hooks/use-queries';
import { useRealtimeSync } from '@/hooks/use-realtime';
import { api } from '@/lib/api';
import {
  columnAccentClass,
  columnClass,
  dueDateBadgeClass,
  dueDateLabel,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '@/lib/task-styles';
import { formatDueDate } from '@/lib/workspace-utils';
import { cn } from '@/lib/cn';
import {
  ALL_STATUSES,
  Task,
  TaskPriority,
  TaskStatus,
} from '@/types/task';
import { WorkspaceMember } from '@/types/member';

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

type ViewMode = 'kanban' | 'list' | 'calendar';

const EMPTY_FILTERS: TaskFiltersState = {
  search: '',
  status: '',
  priority: '',
  assigneeId: '',
};

export default function ProjectPage({ params }: ProjectPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { projectId } = use(params);
  const { showToast } = useToast();

  const [filters, setFilters] = useState<TaskFiltersState>(EMPTY_FILTERS);
  const [debouncedFilters, setDebouncedFilters] =
    useState<TaskFiltersState>(EMPTY_FILTERS);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quickCreateStatus, setQuickCreateStatus] = useState<TaskStatus | null>(
    null,
  );

  const projectQuery = useProject(projectId);
  useRealtimeSync(projectId);
  const tasksQuery = useTasks(projectId, debouncedFilters, 1, 500);
  const favoritesQuery = useFavorites();
  const deepLinkTaskId = searchParams.get('task');

  const [openedTaskId, setOpenedTaskId] = useState<string | null>(null);
  const selectedTaskId = openedTaskId ?? deepLinkTaskId;
  const singleTaskQuery = useTask(
    projectId,
    deepLinkTaskId &&
      !(tasksQuery.data?.items ?? []).some((item) => item.id === deepLinkTaskId)
      ? deepLinkTaskId
      : null,
  );

  const isFavorite = useMemo(() => {
    return (favoritesQuery.data ?? []).some(
      (favorite) => favorite.projectId === projectId,
    );
  }, [favoritesQuery.data, projectId]);

  const tasks = tasksQuery.data?.items ?? [];

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) {
      return null;
    }
    return (
      tasks.find((task) => task.id === selectedTaskId) ??
      (singleTaskQuery.data?.id === selectedTaskId
        ? singleTaskQuery.data
        : null)
    );
  }, [selectedTaskId, tasks, singleTaskQuery.data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);
    return () => clearTimeout(timeout);
  }, [filters]);

  useEffect(() => {
    function handleNewTask() {
      setQuickCreateStatus('TODO');
    }

    window.addEventListener('taskflow:new-task', handleNewTask);
    return () => window.removeEventListener('taskflow:new-task', handleNewTask);
  }, []);

  const refreshProject = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
      queryClient.invalidateQueries({
        queryKey: ['tasks', projectId],
      }),
    ]);
  }, [queryClient, projectId]);

  const queryKey = tasksQueryKey(projectId, debouncedFilters, 1, 500);

  async function toggleFavorite() {
    try {
      if (isFavorite) {
        await api(`/users/me/favorites/${projectId}`, { method: 'DELETE' });
        showToast('Removed from favorites', 'success');
      } else {
        await api('/users/me/favorites', {
          method: 'POST',
          body: JSON.stringify({ projectId }),
        });
        showToast('Added to favorites', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Unable to update favorite',
      );
    }
  }

  async function exportCsv() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? '/api'}/projects/${projectId}/tasks/export`,
        { credentials: 'include' },
      );
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tasks-${projectId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('CSV exported', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Unable to export CSV',
      );
    }
  }

  async function updateTaskStatus(taskId: string, newStatus: TaskStatus) {
    const previous = queryClient.getQueryData<{ items: Task[] }>(queryKey);
    const task = previous?.items.find((item) => item.id === taskId);

    if (!task || task.status === newStatus) {
      return;
    }

    queryClient.setQueryData<{ items: Task[]; total: number }>(queryKey, (data) => {
      if (!data) {
        return data;
      }
      return {
        ...data,
        items: data.items.map((item) =>
          item.id === taskId ? { ...item, status: newStatus } : item,
        ),
      };
    });

    try {
      await api(`/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      showToast(`Moved to ${STATUS_LABELS[newStatus]}`, 'success');
    } catch (updateError) {
      queryClient.setQueryData(queryKey, previous);
      showToast(
        updateError instanceof Error
          ? updateError.message
          : 'Unable to update task',
      );
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const taskId = String(active.id);
    const newStatus = String(over.id) as TaskStatus;
    await updateTaskStatus(taskId, newStatus);
  }

  async function updateTaskTitle(taskId: string, title: string) {
    try {
      await api(`/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      });
      await refreshProject();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Unable to update title',
      );
    }
  }

  async function quickCreateTask(data: {
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
    dueDate: string;
  }) {
    if (data.title.trim().length < 3) {
      return;
    }

    try {
      await api(`/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          title: data.title.trim(),
          status: data.status,
          priority: data.priority,
          assigneeId: data.assigneeId || null,
          dueDate: data.dueDate || null,
        }),
      });
      await refreshProject();
      showToast('Task created', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Unable to create task',
      );
    }
  }

  async function updateProject(data: {
    name: string;
    description?: string | null;
  }) {
    await api(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    await refreshProject();
    showToast('Project updated', 'success');
  }

  async function deleteProject() {
    await api(`/projects/${projectId}`, { method: 'DELETE' });
    showToast('Project deleted', 'success');
    router.push(
      projectQuery.data?.project
        ? `/workspaces/${projectQuery.data.project.workspaceId}`
        : '/dashboard',
    );
  }

  if (projectQuery.isLoading || tasksQuery.isLoading) {
    return <LoadingScreen message="Loading project..." />;
  }

  if (projectQuery.isError || tasksQuery.isError) {
    const message =
      (projectQuery.error instanceof Error
        ? projectQuery.error.message
        : null) ??
      (tasksQuery.error instanceof Error ? tasksQuery.error.message : null) ??
      'Unable to load project.';

    return (
      <AppShell breadcrumbs={[{ label: 'Project' }]}>
        <Alert variant="error">{message}</Alert>
      </AppShell>
    );
  }

  const project = projectQuery.data?.project;
  const members = projectQuery.data?.members ?? [];

  const visibleStatuses = debouncedFilters.status
    ? [debouncedFilters.status]
    : ALL_STATUSES;

  const tasksByStatus = ALL_STATUSES.reduce(
    (acc, status) => {
      acc[status] = tasks.filter((task) => task.status === status);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>,
  );

  function toggleSelect(taskId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        {
          label: project?.workspace?.name ?? 'Workspace',
          href: project ? `/workspaces/${project.workspaceId}` : undefined,
        },
        { label: project?.name ?? 'Project' },
      ]}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground">{project?.name}</h1>
            <button
              type="button"
              onClick={toggleFavorite}
              className="text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite ? '★' : '☆'}
            </button>
          </div>
          {project?.description && (
            <p className="mt-1 text-muted">{project.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setBulkMode((value) => !value);
              setSelectedIds(new Set());
            }}
          >
            {bulkMode ? 'Cancel select' : 'Select tasks'}
          </Button>
          <Button variant="secondary" onClick={() => setShowEditModal(true)}>
            Project settings
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <TaskFilters filters={filters} members={members} onChange={setFilters} />
        <div
          className="flex rounded-lg border border-border bg-surface p-1 shadow-sm"
          role="group"
          aria-label="View mode"
        >
          {(
            [
              ['kanban', 'Kanban'],
              ['list', 'List'],
              ['calendar', 'Calendar'],
            ] as const
          ).map(([mode, label]) => (
            <Button
              key={mode}
              variant={viewMode === mode ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode(mode)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-4">
        <div className="xl:col-span-3">
          {tasksQuery.isFetching && tasks.length === 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {ALL_STATUSES.map((status) => (
                <KanbanColumnSkeleton key={status} />
              ))}
            </div>
          ) : viewMode === 'kanban' ? (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {visibleStatuses.map((status) => (
                  <TaskColumn
                    key={status}
                    title={STATUS_LABELS[status]}
                    status={status}
                    tasks={tasksByStatus[status]}
                    members={members}
                    bulkMode={bulkMode}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onSelectTask={(task) => setOpenedTaskId(task.id)}
                    onUpdateTitle={updateTaskTitle}
                    onQuickCreate={quickCreateTask}
                  />
                ))}
              </div>
            </DndContext>
          ) : viewMode === 'list' ? (
            <ListView
              tasks={tasks}
              selectedIds={selectedIds}
              bulkMode={bulkMode}
              onSelectTask={(task) => setOpenedTaskId(task.id)}
              onToggleSelect={toggleSelect}
              onUpdateTitle={updateTaskTitle}
            />
          ) : (
            <CalendarView
              tasks={tasks}
              onSelectTask={(task) => setOpenedTaskId(task.id)}
            />
          )}

          {quickCreateStatus && (
            <QuickCreateBar
              status={quickCreateStatus}
              members={members}
              onClose={() => setQuickCreateStatus(null)}
              onSubmit={(data) => {
                quickCreateTask({ ...data, status: quickCreateStatus });
                setQuickCreateStatus(null);
              }}
            />
          )}
        </div>

        <ActivityFeed
          activities={projectQuery.data?.activities ?? []}
          collapsible
        />
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectId={projectId}
          workspaceId={project?.workspaceId ?? ''}
          members={members}
          onClose={() => setOpenedTaskId(null)}
          onUpdated={() => {
            refreshProject();
          }}
          onDeleted={() => {
            setOpenedTaskId(null);
            refreshProject();
          }}
        />
      )}

      {showEditModal && project && (
        <EditProjectModal
          name={project.name}
          description={project.description}
          onClose={() => setShowEditModal(false)}
          onSubmit={updateProject}
          onDelete={deleteProject}
        />
      )}
    </AppShell>
  );
}

function TaskColumn({
  title,
  status,
  tasks,
  members,
  bulkMode,
  selectedIds,
  onToggleSelect,
  onSelectTask,
  onUpdateTitle,
  onQuickCreate,
}: {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  members: WorkspaceMember[];
  bulkMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (taskId: string) => void;
  onSelectTask: (task: Task) => void;
  onUpdateTitle: (taskId: string, title: string) => void;
  onQuickCreate: (data: {
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
    dueDate: string;
  }) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  return (
    <section
      ref={setNodeRef}
      aria-label={`${title} column`}
      className={columnClass(status, isOver)}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className={cn('font-semibold', columnAccentClass(status))}>{title}</h2>
        <Badge variant="default">{tasks.length}</Badge>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            bulkMode={bulkMode}
            selected={selectedIds.has(task.id)}
            onToggleSelect={() => onToggleSelect(task.id)}
            onSelect={() => onSelectTask(task)}
            onUpdateTitle={(newTitle) => onUpdateTitle(task.id, newTitle)}
          />
        ))}
      </div>

      {showQuickCreate ? (
        <QuickCreateRow
          members={members}
          onCancel={() => setShowQuickCreate(false)}
          onSubmit={(data) => {
            onQuickCreate({ ...data, status });
            setShowQuickCreate(false);
          }}
        />
      ) : (
        <Button
          variant="secondary"
          className="mt-4 w-full border-dashed"
          onClick={() => setShowQuickCreate(true)}
        >
          + Add task
        </Button>
      )}
    </section>
  );
}

function QuickCreateRow({
  members,
  onCancel,
  onSubmit,
}: {
  members: WorkspaceMember[];
  onCancel: () => void;
  onSubmit: (data: {
    title: string;
    priority: TaskPriority;
    assigneeId: string;
    dueDate: string;
  }) => void;
}) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');

  return (
    <div className="mt-4 space-y-2 rounded-lg border border-dashed border-border bg-surface p-3">
      <Input
        placeholder="Task title..."
        value={title}
        autoFocus
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onSubmit({ title, priority, assigneeId, dueDate });
          }
          if (event.key === 'Escape') {
            onCancel();
          }
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Select
          value={priority}
          onChange={(event) => setPriority(event.target.value as TaskPriority)}
          aria-label="Priority"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </Select>
        <Select
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
          aria-label="Assignee"
        >
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.user.id} value={member.user.id}>
              {member.user.name}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          aria-label="Due date"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSubmit({ title, priority, assigneeId, dueDate })}>
          Add
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function QuickCreateBar({
  status,
  members,
  onClose,
  onSubmit,
}: {
  status: TaskStatus;
  members: WorkspaceMember[];
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    priority: TaskPriority;
    assigneeId: string;
    dueDate: string;
  }) => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 px-4">
      <div className="rounded-xl border border-border bg-surface p-4 shadow-2xl">
        <p className="mb-2 text-sm font-medium text-muted">
          New task in {STATUS_LABELS[status]}
        </p>
        <QuickCreateRow
          members={members}
          onCancel={onClose}
          onSubmit={(data) => {
            onSubmit(data);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

function priorityVariant(priority: TaskPriority) {
  switch (priority) {
    case 'LOW':
      return 'low' as const;
    case 'MEDIUM':
      return 'medium' as const;
    case 'HIGH':
      return 'high' as const;
  }
}

function dueVariant(due: {
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean;
}) {
  if (due.isOverdue) {
    return 'overdue' as const;
  }
  if (due.isDueToday) {
    return 'due-today' as const;
  }
  if (due.isDueSoon) {
    return 'due-soon' as const;
  }
  return 'default' as const;
}

function TaskCard({
  task,
  bulkMode,
  selected,
  onToggleSelect,
  onSelect,
  onUpdateTitle,
}: {
  task: Task;
  bulkMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onSelect: () => void;
  onUpdateTitle: (title: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });
  const due = formatDueDate(task.dueDate);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  function commitTitle() {
    const trimmed = title.trim();
    if (trimmed.length >= 3 && trimmed !== task.title) {
      onUpdateTitle(trimmed);
    } else {
      setTitle(task.title);
    }
    setEditingTitle(false);
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-xl border border-border bg-surface p-4 shadow-sm',
        isDragging && 'opacity-60 ring-2 ring-primary',
        selected && 'ring-2 ring-primary',
      )}
    >
      <div className="flex items-start gap-2">
        {bulkMode && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select ${task.title}`}
            className="mt-1"
          />
        )}
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="cursor-grab rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Drag task: ${task.title}`}
        >
          <span aria-hidden="true">⠿</span>
        </button>
        <div className="flex-1">
          {editingTitle ? (
            <Input
              value={title}
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
              onBlur={commitTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commitTitle();
                }
                if (event.key === 'Escape') {
                  setTitle(task.title);
                  setEditingTitle(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              onClick={onSelect}
              onDoubleClick={(event) => {
                event.preventDefault();
                setEditingTitle(true);
              }}
              className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <h3 className="font-semibold text-foreground">{task.title}</h3>
            </button>
          )}
          {task.description && (
            <p className="mt-2 line-clamp-2 text-sm text-muted">
              {task.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant={priorityVariant(task.priority)}>
              {PRIORITY_LABELS[task.priority]}
            </Badge>
            {task.assignee && (
              <Badge variant="info">{task.assignee.name}</Badge>
            )}
            {due && (
              <Badge variant={dueVariant(due)} className={dueDateBadgeClass(due)}>
                {dueDateLabel(due)}
              </Badge>
            )}
            {task.labels?.map((label) => (
              <Badge
                key={label.id}
                style={{ backgroundColor: `${label.color}22`, color: label.color }}
              >
                {label.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

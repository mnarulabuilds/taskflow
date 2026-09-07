'use client';

import { use, useEffect, useState } from 'react';
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
import { CreateTaskModal } from '@/components/create-task-modal';
import { EditProjectModal } from '@/components/edit-project-modal';
import { LoadingScreen } from '@/components/loading-screen';
import { TaskDetailModal } from '@/components/task-detail-modal';
import {
  TaskFilters,
  TaskFiltersState,
} from '@/components/task-filters';
import { useToast } from '@/components/toast-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProject, useTasks } from '@/hooks/use-queries';
import { api } from '@/lib/api';
import {
  columnAccentClass,
  columnClass,
  dueDateBadgeClass,
  dueDateLabel,
  PRIORITY_LABELS,
} from '@/lib/task-styles';
import { formatDueDate } from '@/lib/workspace-utils';
import { cn } from '@/lib/cn';
import { Task, TaskPriority, TaskStatus } from '@/types/task';

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

const EMPTY_FILTERS: TaskFiltersState = {
  search: '',
  status: '',
  priority: '',
  assigneeId: '',
};

const COLUMN_TITLES: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createTaskStatus, setCreateTaskStatus] = useState<TaskStatus | null>(
    null,
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [page, setPage] = useState(1);

  const projectQuery = useProject(projectId);
  const tasksQuery = useTasks(projectId, debouncedFilters, page);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedFilters(filters);
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [filters]);

  useEffect(() => {
    const taskId = searchParams.get('task');
    const tasks = tasksQuery.data?.items ?? [];

    if (taskId && tasks.length > 0) {
      const task = tasks.find((item) => item.id === taskId);
      if (task) {
        setSelectedTask(task);
      }
    }
  }, [searchParams, tasksQuery.data?.items]);

  async function refreshProject() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
    ]);
  }

  async function createTask(title: string) {
    if (!createTaskStatus) {
      return;
    }

    await api(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        status: createTaskStatus,
        priority: 'MEDIUM',
      }),
    });

    await refreshProject();
    showToast('Task created', 'success');
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    try {
      await api(`/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await refreshProject();
    } catch (updateError) {
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
    const task = tasksQuery.data?.items.find((item) => item.id === taskId);

    if (!task || task.status === newStatus) {
      return;
    }

    await updateTaskStatus(taskId, newStatus);
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

  const project = projectQuery.data?.project;
  const tasks = tasksQuery.data?.items ?? [];
  const pagination = tasksQuery.data;

  const todoTasks = tasks.filter((task) => task.status === 'TODO');
  const inProgressTasks = tasks.filter((task) => task.status === 'IN_PROGRESS');
  const doneTasks = tasks.filter((task) => task.status === 'DONE');

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
          <h1 className="text-3xl font-bold text-foreground">{project?.name}</h1>
          {project?.description && (
            <p className="mt-1 text-muted">{project.description}</p>
          )}
        </div>
        <Button variant="secondary" onClick={() => setShowEditModal(true)}>
          Project settings
        </Button>
      </div>

      <div className="mt-6">
        <TaskFilters
          filters={filters}
          members={projectQuery.data?.members ?? []}
          onChange={setFilters}
        />
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="grid gap-6 lg:grid-cols-3">
              <TaskColumn
                title={COLUMN_TITLES.TODO}
                status="TODO"
                tasks={todoTasks}
                onCreate={() => setCreateTaskStatus('TODO')}
                onSelectTask={setSelectedTask}
              />
              <TaskColumn
                title={COLUMN_TITLES.IN_PROGRESS}
                status="IN_PROGRESS"
                tasks={inProgressTasks}
                onCreate={() => setCreateTaskStatus('IN_PROGRESS')}
                onSelectTask={setSelectedTask}
              />
              <TaskColumn
                title={COLUMN_TITLES.DONE}
                status="DONE"
                tasks={doneTasks}
                onCreate={() => setCreateTaskStatus('DONE')}
                onSelectTask={setSelectedTask}
              />
            </div>
          </DndContext>

          {pagination && pagination.totalPages > 1 && (
            <nav
              aria-label="Task pagination"
              className="mt-4 flex items-center justify-between text-sm text-muted"
            >
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total}{' '}
                tasks)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </nav>
          )}
        </div>

        <ActivityFeed activities={projectQuery.data?.activities ?? []} />
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectId={projectId}
          members={projectQuery.data?.members ?? []}
          onClose={() => setSelectedTask(null)}
          onUpdated={(task) => {
            setSelectedTask(task);
            refreshProject();
          }}
          onDeleted={() => {
            setSelectedTask(null);
            refreshProject();
          }}
        />
      )}

      {createTaskStatus && (
        <CreateTaskModal
          status={createTaskStatus}
          onClose={() => setCreateTaskStatus(null)}
          onSubmit={createTask}
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
  onCreate,
  onSelectTask,
}: {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onCreate: () => void;
  onSelectTask: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

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
            onSelect={() => onSelectTask(task)}
          />
        ))}
      </div>

      <Button
        variant="secondary"
        className="mt-4 w-full border-dashed"
        onClick={onCreate}
      >
        + Add task
      </Button>
    </section>
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

function TaskCard({ task, onSelect }: { task: Task; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });
  const due = formatDueDate(task.dueDate);

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-xl border border-border bg-surface p-4 shadow-sm',
        isDragging && 'opacity-60 ring-2 ring-primary',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="cursor-grab rounded p-1 text-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Drag task: ${task.title}`}
        >
          <span aria-hidden="true">⠿</span>
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <h3 className="font-semibold text-foreground">{task.title}</h3>
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
          </div>
        </button>
      </div>
    </article>
  );
}

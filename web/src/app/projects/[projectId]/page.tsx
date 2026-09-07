'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { TaskDetailModal } from '@/components/task-detail-modal';
import {
  buildTaskQuery,
  TaskFilters,
  TaskFiltersState,
} from '@/components/task-filters';
import { useToast } from '@/components/toast-provider';
import { api } from '@/lib/api';
import { Activity } from '@/types/activity';
import { ProjectDetail } from '@/types/project';
import { WorkspaceMember } from '@/types/member';
import { Task, TaskStatus } from '@/types/task';

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

const EMPTY_FILTERS: TaskFiltersState = {
  search: '',
  status: '',
  priority: '',
  assigneeId: '',
};

export default function ProjectPage({ params }: ProjectPageProps) {
  const router = useRouter();
  const { projectId } = use(params);
  const { showToast } = useToast();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filters, setFilters] = useState<TaskFiltersState>(EMPTY_FILTERS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createTaskStatus, setCreateTaskStatus] = useState<TaskStatus | null>(
    null,
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const loadProjectMeta = useCallback(async () => {
    const projectData = await api<ProjectDetail>(`/projects/${projectId}`);
    const memberData = await api<WorkspaceMember[]>(
      `/workspaces/${projectData.workspaceId}/members`,
    );
    const activityData = await api<Activity[]>(
      `/projects/${projectId}/activity`,
    );

    setProject(projectData);
    setMembers(memberData);
    setActivities(activityData);
    return projectData;
  }, [projectId]);

  const loadTasks = useCallback(
    async (nextFilters: TaskFiltersState) => {
      const query = buildTaskQuery(nextFilters);
      const taskData = await api<Task[]>(
        `/projects/${projectId}/tasks${query}`,
      );
      setTasks(taskData);
    },
    [projectId],
  );

  useEffect(() => {
    loadProjectMeta()
      .then(() => loadTasks(EMPTY_FILTERS))
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load project',
        );
      })
      .finally(() => setLoading(false));
  }, [loadProjectMeta, loadTasks]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const timeout = setTimeout(() => {
      loadTasks(filters).catch((loadError) => {
        showToast(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to filter tasks',
        );
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [filters, loading, loadTasks, showToast]);

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

    await Promise.all([loadTasks(filters), loadProjectMeta()]);
    showToast('Task created', 'success');
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    const previousTasks = tasks;
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status } : task,
      ),
    );

    try {
      await api(`/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadProjectMeta();
    } catch (updateError) {
      setTasks(previousTasks);
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
    const task = tasks.find((current) => current.id === taskId);

    if (!task || task.status === newStatus) {
      return;
    }

    await updateTaskStatus(taskId, newStatus);
  }

  async function updateProject(data: {
    name: string;
    description?: string | null;
  }) {
    const updated = await api<ProjectDetail>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    setProject(updated);
    showToast('Project updated', 'success');
  }

  async function deleteProject() {
    await api(`/projects/${projectId}`, { method: 'DELETE' });
    showToast('Project deleted', 'success');
    router.push(
      project ? `/workspaces/${project.workspaceId}` : '/dashboard',
    );
  }

  function handleTaskUpdated(updatedTask: Task) {
    setTasks((current) =>
      current.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
    );
  }

  function handleTaskDeleted(taskId: string) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }

  const todoTasks = tasks.filter((task) => task.status === 'TODO');
  const inProgressTasks = tasks.filter((task) => task.status === 'IN_PROGRESS');
  const doneTasks = tasks.filter((task) => task.status === 'DONE');

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        Loading project...
      </main>
    );
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
          <h1 className="text-2xl font-semibold">{project?.name}</h1>
          {project?.description && (
            <p className="mt-1 text-gray-600">{project.description}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Drag tasks between columns or click to edit.
          </p>
        </div>
        <button
          onClick={() => setShowEditModal(true)}
          className="rounded border px-4 py-2 text-sm"
        >
          Project settings
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded border p-4 text-red-600">{error}</div>
      )}

      <div className="mt-6">
        <TaskFilters filters={filters} members={members} onChange={setFilters} />
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="grid gap-6 lg:grid-cols-3">
              <TaskColumn
                title="Todo"
                status="TODO"
                tasks={todoTasks}
                onCreate={() => setCreateTaskStatus('TODO')}
                onSelectTask={setSelectedTask}
              />
              <TaskColumn
                title="In Progress"
                status="IN_PROGRESS"
                tasks={inProgressTasks}
                onCreate={() => setCreateTaskStatus('IN_PROGRESS')}
                onSelectTask={setSelectedTask}
              />
              <TaskColumn
                title="Done"
                status="DONE"
                tasks={doneTasks}
                onCreate={() => setCreateTaskStatus('DONE')}
                onSelectTask={setSelectedTask}
              />
            </div>
          </DndContext>
        </div>

        <ActivityFeed activities={activities} />
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectId={projectId}
          members={members}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
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
      className={`min-h-96 rounded-xl p-4 transition ${
        isOver ? 'bg-gray-200' : 'bg-gray-100'
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className="rounded-full bg-white px-2 py-1 text-xs">
          {tasks.length}
        </span>
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

      <button
        onClick={onCreate}
        className="mt-4 w-full rounded-lg border border-dashed bg-white p-3 text-sm"
      >
        + Add task
      </button>
    </section>
  );
}

function TaskCard({ task, onSelect }: { task: Task; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-white p-4 shadow-sm ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="cursor-grab pt-0.5 text-gray-400 hover:text-gray-600"
          aria-label="Drag task"
        >
          ⠿
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 text-left"
        >
          <h3 className="font-medium">{task.title}</h3>
          {task.description && (
            <p className="mt-2 line-clamp-2 text-sm text-gray-500">
              {task.description}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span>{task.priority}</span>
            {task.assignee && <span>{task.assignee.name}</span>}
          </div>
        </button>
      </div>
    </article>
  );
}

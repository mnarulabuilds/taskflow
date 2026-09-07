'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import { CreateTaskModal } from '@/components/create-task-modal';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { useToast } from '@/components/toast-provider';
import { api } from '@/lib/api';
import { ProjectDetail } from '@/types/project';
import { WorkspaceMember } from '@/types/member';
import { Task, TaskStatus } from '@/types/task';

interface ProjectPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = use(params);
  const { showToast } = useToast();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createTaskStatus, setCreateTaskStatus] = useState<TaskStatus | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const todoTasks = tasks.filter((task) => task.status === 'TODO');
  const inProgressTasks = tasks.filter((task) => task.status === 'IN_PROGRESS');
  const doneTasks = tasks.filter((task) => task.status === 'DONE');

  const loadProjectBoard = useCallback(async () => {
    try {
      const projectData = await api<ProjectDetail>(`/projects/${projectId}`);

      const [taskData, memberData] = await Promise.all([
        api<Task[]>(`/projects/${projectId}/tasks`),
        api<WorkspaceMember[]>(
          `/workspaces/${projectData.workspaceId}/members`,
        ),
      ]);

      setProject(projectData);
      setTasks(taskData);
      setMembers(memberData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load project',
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectBoard();
  }, [loadProjectBoard]);

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

    await loadProjectBoard();
    showToast('Task created', 'success');
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    const previousTasks = tasks;

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, status } : task,
      ),
    );

    try {
      await api(`/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
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
    const task = tasks.find((currentTask) => currentTask.id === taskId);

    if (!task || task.status === newStatus) {
      return;
    }

    await updateTaskStatus(taskId, newStatus);
  }

  function handleTaskUpdated(updatedTask: Task) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === updatedTask.id ? updatedTask : task,
      ),
    );
  }

  function handleTaskDeleted(taskId: string) {
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId),
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        Loading tasks...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl p-6">
        <Link
          href={
            project ? `/workspaces/${project.workspaceId}` : '/dashboard'
          }
          className="text-sm text-gray-500"
        >
          ← Back to workspace
        </Link>

        <div className="mt-6">
          <h1 className="text-2xl font-semibold">
            {project?.name ?? 'Project Board'}
          </h1>
          <p className="mt-1 text-gray-500">
            Drag tasks between columns or click a task to edit details.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded border p-4 text-red-600">{error}</div>
        )}

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
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
    </main>
  );
}

interface TaskColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onCreate: () => void;
  onSelectTask: (task: Task) => void;
}

function TaskColumn({
  title,
  status,
  tasks,
  onCreate,
  onSelectTask,
}: TaskColumnProps) {
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

interface TaskCardProps {
  task: Task;
  onSelect: () => void;
}

function TaskCard({ task, onSelect }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onSelect}
      className={`cursor-grab rounded-lg border bg-white p-4 shadow-sm ${
        isDragging ? 'opacity-50' : ''
      }`}
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
    </article>
  );
}

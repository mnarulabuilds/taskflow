'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import {
    Task,
    TaskStatus,
} from '@/types/task';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';

interface ProjectPageProps {
    params: Promise<{
        projectId: string;
    }>;
}

export default function ProjectPage({
    params,
}: ProjectPageProps) {
    const router = useRouter();
    const { projectId } = use(params);

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    const todoTasks = tasks.filter(
        (task) => task.status === 'TODO',
    );

    const inProgressTasks = tasks.filter(
        (task) => task.status === 'IN_PROGRESS',
    );

    const doneTasks = tasks.filter(
        (task) => task.status === 'DONE',
    );

    async function loadTasks() {
        const token = getAccessToken();

        if (!token) {
            router.replace('/login');
            return;
        }

        try {
            const data = await api<Task[]>(
                `/projects/${projectId}/tasks`,
                { token },
            );

            setTasks(data);
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : 'Unable to load tasks',
            );
        } finally {
            setLoading(false);
        }
    }

    async function createTask(status: TaskStatus) {
        const title = window.prompt('Task title');

        if (!title?.trim()) {
            return;
        }

        const token = getAccessToken();

        if (!token) {
            router.replace('/login');
            return;
        }

        try {
            setCreating(true);

            await api(`/projects/${projectId}/tasks`, {
                method: 'POST',
                token,
                body: JSON.stringify({
                    title: title.trim(),
                    status,
                    priority: 'MEDIUM',
                }),
            });

            await loadTasks();
        } catch (error) {
            window.alert(
                error instanceof Error
                    ? error.message
                    : 'Unable to create task',
            );
        } finally {
            setCreating(false);
        }
    }

    async function updateTaskStatus(
        taskId: string,
        status: TaskStatus,
    ) {
        const token = getAccessToken();

        if (!token) {
            router.replace('/login');
            return;
        }

        const previousTasks = tasks;

        setTasks((currentTasks) =>
            currentTasks.map((task) =>
                task.id === taskId
                    ? {
                        ...task,
                        status,
                    }
                    : task,
            ),
        );

        try {
            await api(`/projects/${projectId}/tasks/${taskId}`, {
                method: 'PATCH',
                token,
                body: JSON.stringify({
                    status,
                }),
            });
        } catch (error) {
            // Roll back the optimistic update.
            setTasks(previousTasks);

            window.alert(
                error instanceof Error
                    ? error.message
                    : 'Unable to update task',
            );
        }
    }

    async function handleDragEnd(
        event: DragEndEvent,
    ) {
        const { active, over } = event;

        if (!over) {
            return;
        }

        const taskId = String(active.id);
        const newStatus = String(over.id) as TaskStatus;

        const task = tasks.find(
            (task) => task.id === taskId,
        );

        if (!task) {
            return;
        }

        if (task.status === newStatus) {
            return;
        }

        await updateTaskStatus(
            taskId,
            newStatus,
        );
    }

    useEffect(() => {
        loadTasks();
    }, [projectId]);

    if (loading) {
        return (
            <main className="p-8">
                Loading tasks...
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white">
            <div className="mx-auto max-w-7xl p-6">
                <Link
                    href="/dashboard"
                    className="text-sm text-gray-500"
                >
                    ← Dashboard
                </Link>

                <div className="mt-6">
                    <h1 className="text-2xl font-semibold">
                        Project Board
                    </h1>

                    <p className="mt-1 text-gray-500">
                        Manage and track your project's tasks.
                    </p>
                </div>

                {error && (
                    <div className="mt-6 rounded border p-4 text-red-600">
                        {error}
                    </div>
                )}

                <DndContext onDragEnd={handleDragEnd}>
                    <div className="mt-8 grid gap-6 lg:grid-cols-3">
                        <TaskColumn
                            title="Todo"
                            status="TODO"
                            tasks={todoTasks}
                            creating={creating}
                            onCreate={createTask}
                        />

                        <TaskColumn
                            title="In Progress"
                            status="IN_PROGRESS"
                            tasks={inProgressTasks}
                            creating={creating}
                            onCreate={createTask}
                        />

                        <TaskColumn
                            title="Done"
                            status="DONE"
                            tasks={doneTasks}
                            creating={creating}
                            onCreate={createTask}
                        />
                    </div>
                </DndContext>
            </div>
        </main>
    );
}

interface TaskColumnProps {
    title: string;
    status: TaskStatus;
    tasks: Task[];
    creating: boolean;

    onCreate: (status: TaskStatus) => void;
}

export function TaskColumn({
    title,
    status,
    tasks,
    creating,
    onCreate,
}: TaskColumnProps) {
    const {
        setNodeRef,
        isOver,
    } = useDroppable({
        id: status,
    });

    return (
        <section
            ref={setNodeRef}
            className={`min-h-96 rounded-xl p-4 transition ${isOver
                    ? 'bg-gray-200'
                    : 'bg-gray-100'
                }`}
        >
            <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">
                    {title}
                </h2>

                <span className="rounded-full bg-white px-2 py-1 text-xs">
                    {tasks.length}
                </span>
            </div>

            <div className="space-y-3">
                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                    />
                ))}
            </div>

            <button
                onClick={() => onCreate(status)}
                disabled={creating}
                className="mt-4 w-full rounded-lg border border-dashed bg-white p-3 text-sm disabled:opacity-50"
            >
                + Add task
            </button>
        </section>
    );
}

interface TaskCardProps {
    task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id: task.id,
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
        : undefined;

    return (
        <article
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`cursor-grab rounded-lg border bg-white p-4 shadow-sm ${isDragging ? 'opacity-50' : ''
                }`}
        >
            <h3 className="font-medium">
                {task.title}
            </h3>

            {task.description && (
                <p className="mt-2 text-sm text-gray-500">
                    {task.description}
                </p>
            )}

            <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                    {task.priority}
                </span>

                <span className="text-xs text-gray-400">
                    {task.status.replace('_', ' ')}
                </span>
            </div>
        </article>
    );
}

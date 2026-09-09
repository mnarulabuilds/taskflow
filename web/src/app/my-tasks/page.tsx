'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { LoadingScreen } from '@/components/loading-screen';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useMyTasks } from '@/hooks/use-queries';
import { STATUS_LABELS, statusBadgeClass } from '@/lib/task-styles';
import { formatDueDate } from '@/lib/workspace-utils';
import { useAuth } from '@/providers/auth-provider';
import { ALL_STATUSES, TaskStatus } from '@/types/task';

type FilterTab = 'all' | 'overdue' | 'dueToday' | 'status';

export default function MyTasksPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');

  const query =
    filterTab === 'overdue'
      ? { overdue: true }
      : filterTab === 'dueToday'
        ? { dueToday: true }
        : filterTab === 'status' && statusFilter
          ? { status: statusFilter }
          : {};

  const tasksQuery = useMyTasks(query);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || tasksQuery.isLoading) {
    return <LoadingScreen message="Loading your tasks..." />;
  }

  if (tasksQuery.isError) {
    return (
      <AppShell breadcrumbs={[{ label: 'My Tasks' }]}>
        <Alert variant="error">
          {tasksQuery.error instanceof Error
            ? tasksQuery.error.message
            : 'Unable to load your tasks.'}
        </Alert>
      </AppShell>
    );
  }

  const tasks = tasksQuery.data ?? [];

  return (
    <AppShell breadcrumbs={[{ label: 'My Tasks' }]}>
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Tasks</h1>
        <p className="mt-1 text-muted">
          Tasks assigned to you across all projects.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['overdue', 'Overdue'],
            ['dueToday', 'Due today'],
            ['status', 'By status'],
          ] as const
        ).map(([tab, label]) => (
          <Button
            key={tab}
            variant={filterTab === tab ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilterTab(tab)}
          >
            {label}
          </Button>
        ))}
        {filterTab === 'status' && (
          <Select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as TaskStatus | '')
            }
            aria-label="Filter by status"
          >
            <option value="">Select status</option>
            {ALL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="mt-8 space-y-3">
        {tasks.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">
            No tasks match this filter.
          </p>
        )}
        {tasks.map((task) => {
          const due = formatDueDate(task.dueDate);

          return (
            <Link
              key={task.id}
              href={`/projects/${task.projectId}?task=${task.id}`}
              className="block rounded-xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-foreground">{task.title}</h2>
                  {task.project && (
                    <p className="mt-1 text-sm text-muted">
                      {task.project.workspace?.name ?? 'Workspace'} /{' '}
                      {task.project.name}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={statusBadgeClass(task.status)}>
                    {STATUS_LABELS[task.status]}
                  </Badge>
                  {due && (
                    <Badge variant={due.isOverdue ? 'overdue' : 'default'}>
                      {due.isOverdue ? 'Overdue' : due.isDueToday ? 'Due today' : due.label}
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}

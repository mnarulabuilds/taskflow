'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  dueDateBadgeClass,
  dueDateLabel,
  PRIORITY_LABELS,
  STATUS_LABELS,
  statusBadgeClass,
} from '@/lib/task-styles';
import { formatDueDate } from '@/lib/workspace-utils';
import { Task, TaskStatus } from '@/types/task';

type SortField = 'title' | 'status' | 'priority' | 'dueDate' | 'assignee';
type SortDirection = 'asc' | 'desc';

interface ListViewProps {
  tasks: Task[];
  selectedIds: Set<string>;
  bulkMode: boolean;
  onSelectTask: (task: Task) => void;
  onToggleSelect: (taskId: string) => void;
  onUpdateTitle: (taskId: string, title: string) => void;
}

const PRIORITY_ORDER = { LOW: 0, MEDIUM: 1, HIGH: 2 };
const STATUS_ORDER: Record<TaskStatus, number> = {
  BACKLOG: 0,
  TODO: 1,
  IN_PROGRESS: 2,
  REVIEW: 3,
  BLOCKED: 4,
  DONE: 5,
};

export function ListView({
  tasks,
  selectedIds,
  bulkMode,
  onSelectTask,
  onToggleSelect,
  onUpdateTitle,
}: ListViewProps) {
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const sortedTasks = useMemo(() => {
    const copy = [...tasks];

    copy.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          comparison = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          break;
        case 'priority':
          comparison = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          break;
        case 'dueDate': {
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = aDate - bDate;
          break;
        }
        case 'assignee':
          comparison = (a.assignee?.name ?? '').localeCompare(
            b.assignee?.name ?? '',
          );
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return copy;
  }, [tasks, sortField, sortDirection]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  }

  function commitTitleEdit(taskId: string) {
    const trimmed = editTitle.trim();
    if (trimmed.length >= 3) {
      onUpdateTitle(taskId, trimmed);
    }
    setEditingId(null);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border bg-surface-muted/60">
          <tr>
            {bulkMode && <th scope="col" className="w-10 px-4 py-3" />}
            {(
              [
                ['title', 'Title'],
                ['status', 'Status'],
                ['priority', 'Priority'],
                ['dueDate', 'Due date'],
                ['assignee', 'Assignee'],
              ] as const
            ).map(([field, label]) => (
              <th key={field} scope="col" className="px-4 py-3 font-semibold">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-foreground hover:text-primary"
                  onClick={() => toggleSort(field)}
                >
                  {label}
                  {sortField === field && (
                    <span aria-hidden="true">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task) => {
            const due = formatDueDate(task.dueDate);

            return (
              <tr
                key={task.id}
                className="border-b border-border last:border-b-0 hover:bg-surface-muted/40"
              >
                {bulkMode && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(task.id)}
                      onChange={() => onToggleSelect(task.id)}
                      aria-label={`Select ${task.title}`}
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  {editingId === task.id ? (
                    <input
                      className="w-full rounded border border-border bg-surface px-2 py-1"
                      value={editTitle}
                      autoFocus
                      onChange={(event) => setEditTitle(event.target.value)}
                      onBlur={() => commitTitleEdit(task.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          commitTitleEdit(task.id);
                        }
                        if (event.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="font-medium text-foreground hover:text-primary"
                      onClick={() => onSelectTask(task)}
                      onDoubleClick={() => {
                        setEditingId(task.id);
                        setEditTitle(task.title);
                      }}
                    >
                      {task.title}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge className={statusBadgeClass(task.status)}>
                    {STATUS_LABELS[task.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="default">{PRIORITY_LABELS[task.priority]}</Badge>
                </td>
                <td className="px-4 py-3">
                  {due ? (
                    <Badge className={dueDateBadgeClass(due)}>
                      {dueDateLabel(due)}
                    </Badge>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">
                  {task.assignee?.name ?? 'Unassigned'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

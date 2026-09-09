import { TaskPriority, TaskStatus } from '@/types/task';

import { cn } from './cn';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  REVIEW: 'Review',
  BLOCKED: 'Blocked',
  DONE: 'Done',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low priority',
  MEDIUM: 'Medium priority',
  HIGH: 'High priority',
};

export function statusBadgeClass(status: TaskStatus) {
  switch (status) {
    case 'BACKLOG':
      return 'bg-slate-100 text-slate-900 border-slate-200';
    case 'TODO':
      return 'bg-indigo-100 text-indigo-900 border-indigo-200';
    case 'IN_PROGRESS':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    case 'REVIEW':
      return 'bg-violet-100 text-violet-900 border-violet-200';
    case 'BLOCKED':
      return 'bg-rose-100 text-rose-900 border-rose-200';
    case 'DONE':
      return 'bg-emerald-100 text-emerald-900 border-emerald-200';
  }
}

export function priorityBadgeClass(priority: TaskPriority) {
  switch (priority) {
    case 'LOW':
      return 'bg-sky-100 text-sky-900 border-sky-200';
    case 'MEDIUM':
      return 'bg-orange-100 text-orange-900 border-orange-200';
    case 'HIGH':
      return 'bg-rose-100 text-rose-900 border-rose-200';
  }
}

export function columnClass(status: TaskStatus, isOver = false) {
  const base =
    'min-h-96 min-w-72 shrink-0 rounded-xl p-4 transition-colors border-2';
  switch (status) {
    case 'BACKLOG':
      return cn(
        base,
        'bg-column-backlog border-column-backlog-accent/30',
        isOver && 'border-column-backlog-accent bg-column-backlog/80',
      );
    case 'TODO':
      return cn(
        base,
        'bg-column-todo border-column-todo-accent/30',
        isOver && 'border-column-todo-accent bg-column-todo/80',
      );
    case 'IN_PROGRESS':
      return cn(
        base,
        'bg-column-progress border-column-progress-accent/30',
        isOver && 'border-column-progress-accent bg-column-progress/80',
      );
    case 'REVIEW':
      return cn(
        base,
        'bg-column-review border-column-review-accent/30',
        isOver && 'border-column-review-accent bg-column-review/80',
      );
    case 'BLOCKED':
      return cn(
        base,
        'bg-column-blocked border-column-blocked-accent/30',
        isOver && 'border-column-blocked-accent bg-column-blocked/80',
      );
    case 'DONE':
      return cn(
        base,
        'bg-column-done border-column-done-accent/30',
        isOver && 'border-column-done-accent bg-column-done/80',
      );
  }
}

export function columnAccentClass(status: TaskStatus) {
  switch (status) {
    case 'BACKLOG':
      return 'text-column-backlog-accent';
    case 'TODO':
      return 'text-column-todo-accent';
    case 'IN_PROGRESS':
      return 'text-column-progress-accent';
    case 'REVIEW':
      return 'text-column-review-accent';
    case 'BLOCKED':
      return 'text-column-blocked-accent';
    case 'DONE':
      return 'text-column-done-accent';
  }
}

export function dueDateBadgeClass(due: {
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean;
}) {
  if (due.isOverdue) {
    return 'bg-rose-100 text-rose-900 border-rose-200';
  }
  if (due.isDueToday) {
    return 'bg-amber-100 text-amber-900 border-amber-200';
  }
  if (due.isDueSoon) {
    return 'bg-yellow-100 text-yellow-900 border-yellow-200';
  }
  return 'bg-surface-muted text-muted-foreground border-border';
}

export function dueDateLabel(due: {
  label: string;
  isOverdue: boolean;
  isDueToday: boolean;
}) {
  if (due.isOverdue) {
    return 'Overdue';
  }
  if (due.isDueToday) {
    return 'Due today';
  }
  return due.label;
}

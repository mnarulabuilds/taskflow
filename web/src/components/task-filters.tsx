'use client';

import { TaskPriority, TaskStatus } from '@/types/task';
import { WorkspaceMember } from '@/types/member';

export interface TaskFiltersState {
  search: string;
  status: TaskStatus | '';
  priority: TaskPriority | '';
  assigneeId: string;
}

interface TaskFiltersProps {
  filters: TaskFiltersState;
  members: WorkspaceMember[];
  onChange: (filters: TaskFiltersState) => void;
}

export function TaskFilters({ filters, members, onChange }: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 rounded-lg border bg-white p-4">
      <input
        type="search"
        placeholder="Search tasks..."
        value={filters.search}
        onChange={(event) =>
          onChange({ ...filters, search: event.target.value })
        }
        className="min-w-48 flex-1 rounded border p-2 text-sm"
      />

      <select
        value={filters.status}
        onChange={(event) =>
          onChange({
            ...filters,
            status: event.target.value as TaskStatus | '',
          })
        }
        className="rounded border p-2 text-sm"
      >
        <option value="">All statuses</option>
        <option value="TODO">Todo</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="DONE">Done</option>
      </select>

      <select
        value={filters.priority}
        onChange={(event) =>
          onChange({
            ...filters,
            priority: event.target.value as TaskPriority | '',
          })
        }
        className="rounded border p-2 text-sm"
      >
        <option value="">All priorities</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
      </select>

      <select
        value={filters.assigneeId}
        onChange={(event) =>
          onChange({ ...filters, assigneeId: event.target.value })
        }
        className="rounded border p-2 text-sm"
      >
        <option value="">All assignees</option>
        {members.map((member) => (
          <option key={member.user.id} value={member.user.id}>
            {member.user.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function buildTaskQuery(filters: TaskFiltersState) {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }
  if (filters.status) {
    params.set('status', filters.status);
  }
  if (filters.priority) {
    params.set('priority', filters.priority);
  }
  if (filters.assigneeId) {
    params.set('assigneeId', filters.assigneeId);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

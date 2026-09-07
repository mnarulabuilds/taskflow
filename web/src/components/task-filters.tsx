'use client';

import { TaskPriority, TaskStatus } from '@/types/task';
import { WorkspaceMember } from '@/types/member';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

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
    <div
      role="search"
      aria-label="Filter tasks"
      className="flex flex-wrap gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm"
    >
      <div className="min-w-48 flex-1">
        <Label htmlFor="task-search" className="sr-only">
          Search tasks
        </Label>
        <Input
          id="task-search"
          type="search"
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(event) =>
            onChange({ ...filters, search: event.target.value })
          }
        />
      </div>

      <div>
        <Label htmlFor="task-status-filter" className="sr-only">
          Filter by status
        </Label>
        <Select
          id="task-status-filter"
          value={filters.status}
          onChange={(event) =>
            onChange({
              ...filters,
              status: event.target.value as TaskStatus | '',
            })
          }
        >
          <option value="">All statuses</option>
          <option value="TODO">To do</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="DONE">Done</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="task-priority-filter" className="sr-only">
          Filter by priority
        </Label>
        <Select
          id="task-priority-filter"
          value={filters.priority}
          onChange={(event) =>
            onChange({
              ...filters,
              priority: event.target.value as TaskPriority | '',
            })
          }
        >
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="task-assignee-filter" className="sr-only">
          Filter by assignee
        </Label>
        <Select
          id="task-assignee-filter"
          value={filters.assigneeId}
          onChange={(event) =>
            onChange({ ...filters, assigneeId: event.target.value })
          }
        >
          <option value="">All assignees</option>
          {members.map((member) => (
            <option key={member.user.id} value={member.user.id}>
              {member.user.name}
            </option>
          ))}
        </Select>
      </div>
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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { Label } from '@/types/label';
import { WorkspaceInvite } from '@/types/notification';
import { Workspace } from '@/types/workspace';
import { WorkspaceRole } from '@/types/member';
import { Activity } from '@/types/activity';
import { Project, ProjectDetail } from '@/types/project';
import { Task, TaskStatus } from '@/types/task';
import { WorkspaceMember } from '@/types/member';
import {
  FavoriteProject,
  UserPreferences,
  UserProfile,
} from '@/types/user';
import { TaskFiltersState } from '@/components/task-filters';

export interface WorkspaceDetail extends Workspace {
  currentUserRole: WorkspaceRole;
}

export interface PaginatedTasks {
  items: Task[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MyTasksQuery {
  status?: TaskStatus | '';
  overdue?: boolean;
  dueToday?: boolean;
}

function buildTaskParams(
  filters: TaskFiltersState,
  page?: number,
  limit?: number,
) {
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
  if (page !== undefined) {
    params.set('page', String(page));
  }
  if (limit !== undefined) {
    params.set('limit', String(limit));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api<Workspace[]>('/workspaces'),
  });
}

export function usePendingInvites() {
  return useQuery({
    queryKey: ['invites', 'pending'],
    queryFn: () => api<WorkspaceInvite[]>('/invites/pending'),
  });
}

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async () => {
      const [workspace, projects, members, activities] = await Promise.all([
        api<WorkspaceDetail>(`/workspaces/${workspaceId}`),
        api<Project[]>(`/workspaces/${workspaceId}/projects`),
        api<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
        api<Activity[]>(`/workspaces/${workspaceId}/activity`),
      ]);

      return { workspace, projects, members, activities };
    },
    enabled: Boolean(workspaceId),
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const project = await api<ProjectDetail>(`/projects/${projectId}`);
      const [members, activities] = await Promise.all([
        api<WorkspaceMember[]>(
          `/workspaces/${project.workspaceId}/members`,
        ),
        api<Activity[]>(`/projects/${projectId}/activity`),
      ]);

      return { project, members, activities };
    },
    enabled: Boolean(projectId),
  });
}

export function useTasks(
  projectId: string,
  filters: TaskFiltersState,
  page = 1,
  limit = 500,
) {
  const queryString = buildTaskParams(filters, page, limit);

  return useQuery({
    queryKey: ['tasks', projectId, filters, page, limit],
    queryFn: () =>
      api<PaginatedTasks>(`/projects/${projectId}/tasks${queryString}`),
    enabled: Boolean(projectId),
  });
}

export function useTask(projectId: string, taskId: string | null) {
  return useQuery({
    queryKey: ['task', projectId, taskId],
    queryFn: () =>
      api<Task>(`/projects/${projectId}/tasks/${taskId}`),
    enabled: Boolean(projectId && taskId),
  });
}

export function useMyTasks(query: MyTasksQuery = {}) {
  const params = new URLSearchParams();
  if (query.status) {
    params.set('status', query.status);
  }
  if (query.overdue) {
    params.set('overdue', 'true');
  }
  if (query.dueToday) {
    params.set('dueToday', 'true');
  }
  const queryString = params.toString();
  const suffix = queryString ? `?${queryString}` : '';

  return useQuery({
    queryKey: ['my-tasks', query],
    queryFn: async () => {
      const result = await api<PaginatedTasks>(`/tasks/my${suffix}`);
      return result.items;
    },
  });
}

export function usePreferences() {
  return useQuery({
    queryKey: ['preferences'],
    queryFn: () => api<UserPreferences>('/users/me/preferences'),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => api<UserProfile>('/users/me/profile'),
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => api<FavoriteProject[]>('/users/me/favorites'),
  });
}

export function useLabels(workspaceId: string) {
  return useQuery({
    queryKey: ['labels', workspaceId],
    queryFn: () => api<Label[]>(`/workspaces/${workspaceId}/labels`),
    enabled: Boolean(workspaceId),
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserPreferences>) =>
      api<UserPreferences>('/users/me/preferences', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['preferences'], data);
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      isFavorite,
    }: {
      projectId: string;
      isFavorite: boolean;
    }) => {
      if (isFavorite) {
        await api(`/users/me/favorites/${projectId}`, { method: 'DELETE' });
      } else {
        await api('/users/me/favorites', {
          method: 'POST',
          body: JSON.stringify({ projectId }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

export function tasksQueryKey(
  projectId: string,
  filters: TaskFiltersState,
  page = 1,
  limit = 500,
) {
  return ['tasks', projectId, filters, page, limit] as const;
}

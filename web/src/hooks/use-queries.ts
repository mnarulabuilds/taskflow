import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { WorkspaceInvite } from '@/types/notification';
import { Workspace } from '@/types/workspace';
import { WorkspaceRole } from '@/types/member';
import { Activity } from '@/types/activity';
import { Project, ProjectDetail } from '@/types/project';
import { Task } from '@/types/task';
import { WorkspaceMember } from '@/types/member';
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
  limit = 50,
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
  params.set('page', String(page));
  params.set('limit', String(limit));

  const queryString = `?${params.toString()}`;

  return useQuery({
    queryKey: ['tasks', projectId, filters, page, limit],
    queryFn: () =>
      api<PaginatedTasks>(`/projects/${projectId}/tasks${queryString}`),
    enabled: Boolean(projectId),
  });
}

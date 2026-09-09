export type ActivityType =
  | 'WORKSPACE_CREATED'
  | 'WORKSPACE_UPDATED'
  | 'WORKSPACE_DELETED'
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_DELETED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_ASSIGNED'
  | 'TASK_DELETED'
  | 'COMMENT_ADDED'
  | 'MEMBER_INVITED'
  | 'MEMBER_JOINED'
  | 'MEMBER_REMOVED'
  | 'MEMBER_ROLE_CHANGED';

export interface Activity {
  id: string;
  type: ActivityType;
  workspaceId: string;
  projectId?: string | null;
  taskId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

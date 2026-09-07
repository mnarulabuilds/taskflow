export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_COMMENT'
  | 'WORKSPACE_INVITE'
  | 'TASK_DUE_SOON';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface WorkspaceInvite {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  expiresAt: string;
  workspace: {
    id: string;
    name: string;
  };
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };
}

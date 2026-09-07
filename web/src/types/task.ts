export interface TaskUser {
  id: string;
  name: string;
  email: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: TaskUser;
  assignee: TaskUser | null;
}

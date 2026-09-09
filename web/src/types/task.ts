export interface TaskUser {
  id: string;
  name: string;
  email: string;
}

export type TaskStatus =
  | 'BACKLOG'
  | 'TODO'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'BLOCKED'
  | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  position: number;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: TaskUser;
  assignee: TaskUser | null;
  subtasks?: TaskSubtask[];
  labels?: TaskLabel[];
  project?: {
    id: string;
    name: string;
    workspace?: {
      id: string;
      name: string;
    };
  };
}

export const ALL_STATUSES: TaskStatus[] = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'REVIEW',
  'BLOCKED',
  'DONE',
];

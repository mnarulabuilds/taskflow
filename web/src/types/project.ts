export interface Project {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    tasks: number;
  };
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  workspace?: {
    id: string;
    name: string;
  };
  _count: {
    tasks: number;
  };
}

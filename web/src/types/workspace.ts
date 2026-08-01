export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;

  _count: {
    projects: number;
    members: number;
  };
}
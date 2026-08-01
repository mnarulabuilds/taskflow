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
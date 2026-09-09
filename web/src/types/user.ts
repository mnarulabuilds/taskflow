export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserPreferences {
  id: string;
  userId: string;
  theme: ThemePreference;
  notifyTaskAssigned: boolean;
  notifyTaskComment: boolean;
  notifyDueSoon: boolean;
  notifyInvite: boolean;
  notifyMention: boolean;
  onboardingCompleted: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
}

export interface FavoriteProject {
  id: string;
  projectId: string;
  createdAt: string;
  project: {
    id: string;
    name: string;
    description: string | null;
    workspaceId: string;
    workspace?: {
      id: string;
      name: string;
    };
    _count?: {
      tasks: number;
    };
  };
}

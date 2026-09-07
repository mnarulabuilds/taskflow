import { WorkspaceRole } from '@/types/member';

export function canManageWorkspace(role?: WorkspaceRole) {
  return role === 'OWNER' || role === 'ADMIN';
}

export function isWorkspaceOwner(role?: WorkspaceRole) {
  return role === 'OWNER';
}

export function formatDueDate(dueDate: string | null) {
  if (!dueDate) {
    return null;
  }

  const date = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    label: date.toLocaleDateString(),
    isOverdue: diffDays < 0,
    isDueToday: diffDays === 0,
    isDueSoon: diffDays > 0 && diffDays <= 3,
  };
}

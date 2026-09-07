import { Activity, ActivityType } from '@/types/activity';

const LABELS: Record<ActivityType, string> = {
  WORKSPACE_CREATED: 'created the workspace',
  WORKSPACE_UPDATED: 'updated the workspace',
  WORKSPACE_DELETED: 'deleted the workspace',
  PROJECT_CREATED: 'created project',
  PROJECT_UPDATED: 'updated project',
  PROJECT_DELETED: 'deleted project',
  TASK_CREATED: 'created task',
  TASK_UPDATED: 'updated task',
  TASK_STATUS_CHANGED: 'changed task status',
  TASK_ASSIGNED: 'assigned a task',
  TASK_DELETED: 'deleted task',
  COMMENT_ADDED: 'commented on',
  MEMBER_INVITED: 'invited',
  MEMBER_JOINED: 'joined the workspace',
};

function activityDetail(activity: Activity) {
  const metadata = activity.metadata ?? {};

  if (activity.type === 'TASK_STATUS_CHANGED') {
    return `"${metadata.title ?? 'task'}" (${String(metadata.from)} → ${String(metadata.to)})`;
  }

  if (typeof metadata.title === 'string') {
    return `"${metadata.title}"`;
  }

  if (typeof metadata.name === 'string') {
    return `"${metadata.name}"`;
  }

  if (typeof metadata.email === 'string') {
    return metadata.email;
  }

  return '';
}

interface ActivityFeedProps {
  activities: Activity[];
  title?: string;
}

export function ActivityFeed({
  activities,
  title = 'Recent activity',
}: ActivityFeedProps) {
  return (
    <section className="rounded-lg border bg-white p-4">
      <h2 className="text-lg font-semibold">{title}</h2>

      {activities.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No activity yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {activities.map((activity) => (
            <li key={activity.id} className="text-sm">
              <span className="font-medium">{activity.user.name}</span>{' '}
              <span className="text-gray-600">
                {LABELS[activity.type]} {activityDetail(activity)}
              </span>
              <p className="mt-1 text-xs text-gray-400">
                {new Date(activity.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

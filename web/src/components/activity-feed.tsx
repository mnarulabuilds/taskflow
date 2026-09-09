'use client';

import { useState } from 'react';

import { Activity, ActivityType } from '@/types/activity';

import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';

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
  MEMBER_REMOVED: 'removed a member',
  MEMBER_ROLE_CHANGED: 'changed a member role',
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
  collapsible?: boolean;
}

export function ActivityFeed({
  activities,
  title = 'Recent activity',
  collapsible = false,
}: ActivityFeedProps) {
  const [expanded, setExpanded] = useState(!collapsible);

  return (
    <Card aria-labelledby="activity-feed-title">
      <div className="flex items-center justify-between gap-2">
        <CardTitle id="activity-feed-title" className="text-lg">
          {title}
        </CardTitle>
        {collapsible && (
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? 'Hide' : 'Show'}
          </Button>
        )}
      </div>

      <div className={cn(collapsible && !expanded && 'hidden lg:block')}>
        {activities.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No activity yet.</p>
        ) : (
          <ul className="mt-4 space-y-3" aria-live="polite">
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="rounded-lg border border-border bg-surface-muted/40 p-3 text-sm"
              >
                <span className="font-semibold text-primary">{activity.user.name}</span>{' '}
                <span className="text-muted">
                  {LABELS[activity.type]} {activityDetail(activity)}
                </span>
                <p className="mt-1 text-xs text-muted">
                  <time dateTime={activity.createdAt}>
                    {new Date(activity.createdAt).toLocaleString()}
                  </time>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtimeSync(projectId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource('/api/events/stream', {
      withCredentials: true,
    });

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          type: string;
          projectId?: string;
        };

        if (data.type === 'ping') {
          return;
        }

        if (data.projectId && projectId && data.projectId !== projectId) {
          return;
        }

        if (data.projectId) {
          queryClient.invalidateQueries({ queryKey: ['tasks', data.projectId] });
          queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
        }

        queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch {
        // ignore malformed events
      }
    };

    return () => source.close();
  }, [projectId, queryClient]);
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { AppShell } from '@/components/app-shell';
import { CreateWorkspaceModal } from '@/components/create-workspace-modal';
import { PendingInvites } from '@/components/pending-invites';
import { DashboardSkeleton } from '@/components/skeleton';
import { useToast } from '@/components/toast-provider';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle, cardClasses } from '@/components/ui/card';
import { usePendingInvites, useWorkspaces } from '@/hooks/use-queries';
import { useAuth } from '@/providers/auth-provider';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const workspacesQuery = useWorkspaces();
  const invitesQuery = usePendingInvites();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  async function refreshDashboard() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['workspaces'] }),
      queryClient.invalidateQueries({ queryKey: ['invites', 'pending'] }),
    ]);
  }

  async function createWorkspace(name: string) {
    await api('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    await refreshDashboard();
    showToast('Workspace created', 'success');
  }

  if (loading || workspacesQuery.isLoading) {
    return (
      <AppShell>
        <DashboardSkeleton />
      </AppShell>
    );
  }

  const workspaces = workspacesQuery.data ?? [];
  const invites = invitesQuery.data ?? [];

  return (
    <AppShell>
      <PendingInvites invites={invites} onAccepted={refreshDashboard} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted">
            Pick a workspace, check My Tasks, or create something new.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>+ New Workspace</Button>
      </div>

      {workspaces.length > 0 ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace, index) => (
            <Link
              key={workspace.id}
              href={`/workspaces/${workspace.id}`}
              className={cardClasses(true)}
              style={{
                borderTopWidth: '3px',
                borderTopColor: ['#6366f1', '#0d9488', '#f59e0b', '#ec4899'][
                  index % 4
                ],
              }}
            >
              <CardTitle className="text-base">{workspace.name}</CardTitle>
              <CardDescription className="mt-3 flex gap-4">
                <span>{workspace._count.projects} projects</span>
                <span>{workspace._count.members} members</span>
              </CardDescription>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="mt-8 border-dashed p-10 text-center">
          <CardTitle className="text-xl">Welcome to TaskFlow</CardTitle>
          <CardDescription className="mt-3">
            Create your first workspace to start organizing projects and tasks.
          </CardDescription>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => setShowCreateModal(true)}>
              Create your first workspace
            </Button>
            <Link
              href="/my-tasks"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
            >
              View My Tasks
            </Link>
          </div>
        </Card>
      )}

      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={createWorkspace}
        />
      )}
    </AppShell>
  );
}

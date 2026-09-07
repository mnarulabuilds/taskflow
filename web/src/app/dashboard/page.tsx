'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { CreateWorkspaceModal } from '@/components/create-workspace-modal';
import { PendingInvites } from '@/components/pending-invites';
import { useToast } from '@/components/toast-provider';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { WorkspaceInvite } from '@/types/notification';
import { Workspace } from '@/types/workspace';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function loadDashboard() {
    const [workspaceData, inviteData] = await Promise.all([
      api<Workspace[]>('/workspaces'),
      api<WorkspaceInvite[]>('/invites/pending'),
    ]);
    setWorkspaces(workspaceData);
    setInvites(inviteData);
  }

  useEffect(() => {
    if (!user) {
      return;
    }

    loadDashboard().catch((error) => {
      showToast(
        error instanceof Error ? error.message : 'Unable to load dashboard',
      );
    });
  }, [user, showToast]);

  async function createWorkspace(name: string) {
    await api('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    await loadDashboard();
    showToast('Workspace created', 'success');
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        Loading TaskFlow...
      </main>
    );
  }

  return (
    <AppShell email={user?.email}>
      <PendingInvites invites={invites} onAccepted={loadDashboard} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-gray-600">Welcome to TaskFlow.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          + New Workspace
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((workspace) => (
          <Link
            key={workspace.id}
            href={`/workspaces/${workspace.id}`}
            className="block rounded-lg border bg-white p-5 transition hover:shadow-md"
          >
            <h2 className="font-semibold">{workspace.name}</h2>
            <div className="mt-4 flex gap-4 text-sm text-gray-500">
              <span>{workspace._count.projects} projects</span>
              <span>{workspace._count.members} members</span>
            </div>
          </Link>
        ))}
      </div>

      {workspaces.length === 0 && (
        <div className="mt-6 rounded-lg border border-dashed bg-white p-10 text-center">
          <p className="text-gray-600">You don&apos;t have any workspaces yet.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 rounded bg-black px-4 py-2 text-sm text-white"
          >
            Create your first workspace
          </button>
        </div>
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

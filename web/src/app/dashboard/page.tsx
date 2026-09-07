'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AppHeader } from '@/components/app-header';
import { CreateWorkspaceModal } from '@/components/create-workspace-modal';
import { useToast } from '@/components/toast-provider';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { Workspace } from '@/types/workspace';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const { showToast } = useToast();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    api<Workspace[]>('/workspaces')
      .then(setWorkspaces)
      .catch((error) => {
        showToast(
          error instanceof Error
            ? error.message
            : 'Unable to load workspaces',
        );
      });
  }, [user, showToast]);

  async function createWorkspace(name: string) {
    await api('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });

    const workspaceData = await api<Workspace[]>('/workspaces');
    setWorkspaces(workspaceData);
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
    <main className="min-h-screen bg-gray-50">
      <AppHeader email={user?.email} onLogout={logout} />

      <section className="mx-auto max-w-6xl p-6">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="mt-2 text-gray-600">Welcome to TaskFlow.</p>

        <div className="mt-8 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Your Workspaces</h3>
            <p className="text-sm text-gray-500">
              Select a workspace to view its projects.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded bg-black px-4 py-2 text-sm text-white"
          >
            + New Workspace
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Link
              key={workspace.id}
              href={`/workspaces/${workspace.id}`}
              className="block rounded-lg border bg-white p-5 transition hover:shadow-md"
            >
              <h4 className="font-semibold">{workspace.name}</h4>
              <div className="mt-4 flex gap-4 text-sm text-gray-500">
                <span>{workspace._count.projects} projects</span>
                <span>{workspace._count.members} members</span>
              </div>
            </Link>
          ))}
        </div>

        {workspaces.length === 0 && (
          <div className="mt-6 rounded-lg border border-dashed p-10 text-center">
            <p className="text-gray-600">
              You don&apos;t have any workspaces yet.
            </p>
          </div>
        )}
      </section>

      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={createWorkspace}
        />
      )}
    </main>
  );
}

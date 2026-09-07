'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api';
import {
  getAccessToken,
  removeAccessToken,
} from '@/lib/auth';
import { Workspace } from '@/types/workspace';
import Link from 'next/link';

interface CurrentUser {
  id: string;
  email: string;
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [creatingWorkspace, setCreatingWorkspace] =
    useState(false);

  function logout() {
    removeAccessToken();
    router.replace('/login');
  }

  async function createWorkspace() {
    const name = window.prompt('Workspace name');

    if (!name?.trim()) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      router.replace('/login');
      return;
    }

    try {
      setCreatingWorkspace(true);

      await api('/workspaces', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: name.trim(),
        }),
      });

      const workspaceData = await api<Workspace[]>(
        '/workspaces',
        { token },
      );

      setWorkspaces(workspaceData);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Unable to create workspace',
      );
    } finally {
      setCreatingWorkspace(false);
    }
  }

  useEffect(() => {
    async function loadDashboard() {
      const token = getAccessToken();

      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        const [currentUser, workspaceData] = await Promise.all([
          api<CurrentUser>('/auth/me', { token }),
          api<Workspace[]>('/workspaces', { token }),
        ]);

        setUser(currentUser);
        setWorkspaces(workspaceData);
      } catch {
        removeAccessToken();
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <main className="p-8">
        Loading TaskFlow...
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-8">
        {error}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-6">
          <h1 className="text-xl font-semibold">
            TaskFlow
          </h1>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.email}
            </span>

            <button
              onClick={logout}
              className="rounded border px-4 py-2 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl p-6">
        <h2 className="text-2xl font-semibold">
          Dashboard
        </h2>

        <p className="mt-2 text-gray-600">
          Welcome to TaskFlow.
        </p>

        <div className="mt-8 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">
              Your Workspaces
            </h3>

            <p className="text-sm text-gray-500">
              Select a workspace to view its projects.
            </p>
          </div>

          <button
            onClick={createWorkspace}
            disabled={creatingWorkspace}
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {creatingWorkspace
              ? 'Creating...'
              : '+ New Workspace'}
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Link
              key={workspace.id}
              href={`/workspaces/${workspace.id}`}
              className="block rounded-lg border bg-white p-5 transition hover:shadow-md"
            >
              <h4 className="font-semibold">
                {workspace.name}
              </h4>

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
              You don't have any workspaces yet.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
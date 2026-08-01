'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api';
import {
  getAccessToken,
  removeAccessToken,
} from '@/lib/auth';

import { Project } from '@/types/project';

interface WorkspacePageProps {
  params: Promise<{
    workspaceId: string;
  }>;
}

export default function WorkspacePage({
  params,
}: WorkspacePageProps) {
  const router = useRouter();

  const { workspaceId } = use(params);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProjects() {
      const token = getAccessToken();

      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        const data = await api<Project[]>(
          `/workspaces/${workspaceId}/projects`,
          { token },
        );

        setProjects(data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'Unable to load projects',
        );
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [router, workspaceId]);

  async function createProject() {
    const name = window.prompt('Project name');

    if (!name?.trim()) {
      return;
    }

    const description =
      window.prompt('Project description') ?? '';

    const token = getAccessToken();

    if (!token) {
      removeAccessToken();
      router.replace('/login');
      return;
    }

    try {
      setCreating(true);

      await api(
        `/workspaces/${workspaceId}/projects`,
        {
          method: 'POST',
          token,
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
          }),
        },
      );

      const refreshedProjects = await api<Project[]>(
        `/workspaces/${workspaceId}/projects`,
        { token },
      );

      setProjects(refreshedProjects);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Unable to create project',
      );
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="p-8">
        Loading projects...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl p-6">

        <Link
          href="/dashboard"
          className="text-sm text-gray-500"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Projects
            </h1>

            <p className="mt-1 text-gray-500">
              Manage projects in this workspace.
            </p>
          </div>

          <button
            onClick={createProject}
            disabled={creating}
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {creating
              ? 'Creating...'
              : '+ New Project'}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded border p-4 text-red-600">
            {error}
          </div>
        )}

        {!error && projects.length === 0 && (
          <div className="mt-8 rounded-lg border border-dashed bg-white p-10 text-center">
            <p className="text-gray-600">
              No projects yet.
            </p>

            <p className="mt-1 text-sm text-gray-400">
              Create your first project to get started.
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-lg border bg-white p-5 transition hover:shadow-md"
            >
              <h2 className="font-semibold">
                {project.name}
              </h2>

              {project.description && (
                <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                  {project.description}
                </p>
              )}

              <p className="mt-4 text-sm text-gray-500">
                {project._count.tasks} tasks
              </p>
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}
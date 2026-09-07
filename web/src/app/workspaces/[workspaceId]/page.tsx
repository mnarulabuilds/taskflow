'use client';

import Link from 'next/link';
import { FormEvent, use, useCallback, useEffect, useState } from 'react';

import { CreateProjectModal } from '@/components/create-project-modal';
import { useToast } from '@/components/toast-provider';
import { api } from '@/lib/api';
import { Project } from '@/types/project';
import { WorkspaceMember, WorkspaceRole } from '@/types/member';

interface WorkspacePageProps {
  params: Promise<{
    workspaceId: string;
  }>;
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspaceId } = use(params);
  const { showToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('MEMBER');
  const [error, setError] = useState('');

  const loadWorkspaceData = useCallback(async () => {
    try {
      const [projectData, memberData] = await Promise.all([
        api<Project[]>(`/workspaces/${workspaceId}/projects`),
        api<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
      ]);

      setProjects(projectData);
      setMembers(memberData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load workspace',
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  async function createProject(data: {
    name: string;
    description?: string;
  }) {
    await api(`/workspaces/${workspaceId}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    await loadWorkspaceData();
    showToast('Project created', 'success');
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setInviting(true);

      await api(`/workspaces/${workspaceId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      setInviteEmail('');
      setInviteRole('MEMBER');
      await loadWorkspaceData();
      showToast('Member invited', 'success');
    } catch (inviteError) {
      showToast(
        inviteError instanceof Error
          ? inviteError.message
          : 'Unable to invite member',
      );
    } finally {
      setInviting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        Loading workspace...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl p-6">
        <Link href="/dashboard" className="text-sm text-gray-500">
          ← Back to dashboard
        </Link>

        <div className="mt-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Workspace</h1>
            <p className="mt-1 text-gray-500">
              Manage projects and members in this workspace.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded bg-black px-4 py-2 text-sm text-white"
          >
            + New Project
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded border p-4 text-red-600">{error}</div>
        )}

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Members</h2>

          <div className="mt-4 overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">{member.user.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {member.user.email}
                    </td>
                    <td className="px-4 py-3">{member.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form
            onSubmit={handleInvite}
            className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4"
          >
            <div className="min-w-48 flex-1">
              <label className="mb-1 block text-sm font-medium">
                Invite by email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                className="w-full rounded border p-2"
                placeholder="colleague@example.com"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Role</label>
              <select
                value={inviteRole}
                onChange={(event) =>
                  setInviteRole(event.target.value as WorkspaceRole)
                }
                className="rounded border p-2"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={inviting}
              className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {inviting ? 'Inviting...' : 'Invite member'}
            </button>
          </form>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Projects</h2>

          {!error && projects.length === 0 && (
            <div className="mt-4 rounded-lg border border-dashed bg-white p-10 text-center">
              <p className="text-gray-600">No projects yet.</p>
              <p className="mt-1 text-sm text-gray-400">
                Create your first project to get started.
              </p>
            </div>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="rounded-lg border bg-white p-5 transition hover:shadow-md"
              >
                <h3 className="font-semibold">{project.name}</h3>

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
        </section>
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={createProject}
        />
      )}
    </main>
  );
}

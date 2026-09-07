'use client';

import Link from 'next/link';
import { FormEvent, use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { ActivityFeed } from '@/components/activity-feed';
import { AppShell } from '@/components/app-shell';
import { CreateProjectModal } from '@/components/create-project-modal';
import { EditWorkspaceModal } from '@/components/edit-workspace-modal';
import { useToast } from '@/components/toast-provider';
import { api } from '@/lib/api';
import { Activity } from '@/types/activity';
import { Project } from '@/types/project';
import { WorkspaceMember, WorkspaceRole } from '@/types/member';

interface WorkspaceDetail {
  id: string;
  name: string;
  ownerId: string;
}

interface WorkspacePageProps {
  params: Promise<{ workspaceId: string }>;
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const router = useRouter();
  const { workspaceId } = use(params);
  const { showToast } = useToast();

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('MEMBER');
  const [error, setError] = useState('');

  const loadWorkspaceData = useCallback(async () => {
    const [workspaceData, projectData, memberData, activityData] =
      await Promise.all([
        api<WorkspaceDetail>(`/workspaces/${workspaceId}`),
        api<Project[]>(`/workspaces/${workspaceId}/projects`),
        api<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
        api<Activity[]>(`/workspaces/${workspaceId}/activity`),
      ]);

    setWorkspace(workspaceData);
    setProjects(projectData);
    setMembers(memberData);
    setActivities(activityData);
  }, [workspaceId]);

  useEffect(() => {
    loadWorkspaceData()
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load workspace',
        );
      })
      .finally(() => setLoading(false));
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

  async function updateWorkspace(name: string) {
    await api(`/workspaces/${workspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
    await loadWorkspaceData();
    showToast('Workspace updated', 'success');
  }

  async function deleteWorkspace() {
    await api(`/workspaces/${workspaceId}`, { method: 'DELETE' });
    showToast('Workspace deleted', 'success');
    router.push('/dashboard');
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setInviting(true);
      const result = await api<
        WorkspaceMember | { inviteSent: true; email: string }
      >(`/workspaces/${workspaceId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      setInviteEmail('');
      setInviteRole('MEMBER');
      await loadWorkspaceData();

      if ('inviteSent' in result) {
        showToast(`Invite sent to ${result.email}`, 'success');
      } else {
        showToast('Member added', 'success');
      }
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
    <AppShell
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: workspace?.name ?? 'Workspace' },
      ]}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{workspace?.name}</h1>
          <p className="mt-1 text-gray-500">
            Manage projects, members, and activity.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="rounded border px-4 py-2 text-sm"
          >
            Settings
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded bg-black px-4 py-2 text-sm text-white"
          >
            + New Project
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded border p-4 text-red-600">{error}</div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <h2 className="text-lg font-semibold">Projects</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
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
            {!error && projects.length === 0 && (
              <div className="mt-4 rounded-lg border border-dashed bg-white p-10 text-center">
                <p className="text-gray-600">No projects yet.</p>
              </div>
            )}
          </section>

          <section>
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
            <p className="mt-2 text-xs text-gray-500">
              If the email isn&apos;t registered yet, an invite link is created
              and they&apos;ll see it when they sign up.
            </p>
          </section>
        </div>

        <ActivityFeed activities={activities} />
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={createProject}
        />
      )}

      {showEditModal && workspace && (
        <EditWorkspaceModal
          name={workspace.name}
          onClose={() => setShowEditModal(false)}
          onSubmit={updateWorkspace}
          onDelete={deleteWorkspace}
        />
      )}
    </AppShell>
  );
}

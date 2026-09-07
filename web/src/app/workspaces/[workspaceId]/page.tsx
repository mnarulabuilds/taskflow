'use client';

import { FormEvent, use, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { ActivityFeed } from '@/components/activity-feed';
import { AppShell } from '@/components/app-shell';
import { CreateProjectModal } from '@/components/create-project-modal';
import { EditWorkspaceModal } from '@/components/edit-workspace-modal';
import { LoadingScreen } from '@/components/loading-screen';
import { useToast } from '@/components/toast-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardDescription, CardTitle, cardClasses } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useWorkspace } from '@/hooks/use-queries';
import { api } from '@/lib/api';
import { canManageWorkspace, isWorkspaceOwner } from '@/lib/workspace-utils';
import { WorkspaceMember, WorkspaceRole } from '@/types/member';

interface WorkspacePageProps {
  params: Promise<{ workspaceId: string }>;
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspaceId } = use(params);
  const { showToast } = useToast();
  const { data, isLoading, error } = useWorkspace(workspaceId);
  const inviteEmailId = useId();
  const inviteRoleId = useId();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('MEMBER');

  const workspace = data?.workspace;
  const canManage = canManageWorkspace(workspace?.currentUserRole);

  async function refreshWorkspace() {
    await queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
  }

  async function createProject(projectData: {
    name: string;
    description?: string;
  }) {
    await api(`/workspaces/${workspaceId}/projects`, {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
    await refreshWorkspace();
    showToast('Project created', 'success');
  }

  async function updateWorkspace(name: string) {
    await api(`/workspaces/${workspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
    await refreshWorkspace();
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
      await refreshWorkspace();

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

  if (isLoading) {
    return <LoadingScreen message="Loading workspace..." />;
  }

  if (error || !workspace) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-background p-8 text-destructive"
        role="alert"
      >
        {error instanceof Error ? error.message : 'Unable to load workspace'}
      </main>
    );
  }

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: workspace.name },
      ]}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{workspace.name}</h1>
          <p className="mt-2 flex items-center gap-2 text-muted">
            Your role:
            <Badge variant="info">{workspace.currentUserRole}</Badge>
          </p>
        </div>

        {canManage && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowEditModal(true)}>
              Settings
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>+ New Project</Button>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section aria-labelledby="projects-heading">
            <h2 id="projects-heading" className="text-xl font-semibold text-foreground">
              Projects
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {(data?.projects ?? []).map((project, index) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={cardClasses(true)}
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: ['#6366f1', '#0d9488', '#f59e0b'][index % 3],
                  }}
                >
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  {project.description && (
                    <CardDescription className="line-clamp-2">
                      {project.description}
                    </CardDescription>
                  )}
                  <CardDescription className="mt-4">
                    {project._count.tasks} tasks
                  </CardDescription>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="members-heading">
            <h2 id="members-heading" className="text-xl font-semibold text-foreground">
              Members
            </h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-muted/60">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                      Name
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                      Email
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.members ?? []).map((member) => (
                    <tr key={member.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3 font-medium">{member.user.name}</td>
                      <td className="px-4 py-3 text-muted">{member.user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{member.role}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canManage && (
              <>
                <form
                  onSubmit={handleInvite}
                  className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm"
                >
                  <div className="min-w-48 flex-1">
                    <Label htmlFor={inviteEmailId}>Invite by email</Label>
                    <Input
                      id={inviteEmailId}
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="colleague@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor={inviteRoleId}>Role</Label>
                    <Select
                      id={inviteRoleId}
                      value={inviteRole}
                      onChange={(event) =>
                        setInviteRole(event.target.value as WorkspaceRole)
                      }
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </Select>
                  </div>
                  <Button type="submit" disabled={inviting}>
                    {inviting ? 'Inviting...' : 'Invite member'}
                  </Button>
                </form>
                <p className="mt-2 text-xs text-muted">
                  Unregistered emails receive a pending invite on signup.
                </p>
              </>
            )}
          </section>
        </div>

        <ActivityFeed activities={data?.activities ?? []} />
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={createProject}
        />
      )}

      {showEditModal && (
        <EditWorkspaceModal
          name={workspace.name}
          onClose={() => setShowEditModal(false)}
          onSubmit={updateWorkspace}
          onDelete={
            isWorkspaceOwner(workspace.currentUserRole)
              ? deleteWorkspace
              : undefined
          }
        />
      )}
    </AppShell>
  );
}

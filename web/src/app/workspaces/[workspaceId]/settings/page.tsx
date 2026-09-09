'use client';

import { FormEvent, use, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { AppShell } from '@/components/app-shell';
import { LoadingScreen } from '@/components/loading-screen';
import { useToast } from '@/components/toast-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useLabels, useWorkspace } from '@/hooks/use-queries';
import { api } from '@/lib/api';
import {
  canManageWorkspace,
  isWorkspaceOwner,
} from '@/lib/workspace-utils';
import { Label as WorkspaceLabel } from '@/types/label';
import { WorkspaceMember, WorkspaceRole } from '@/types/member';

interface WorkspaceSettingsPageProps {
  params: Promise<{ workspaceId: string }>;
}

export default function WorkspaceSettingsPage({
  params,
}: WorkspaceSettingsPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspaceId } = use(params);
  const { showToast } = useToast();
  const { data, isLoading } = useWorkspace(workspaceId);
  const labelsQuery = useLabels(workspaceId);

  const nameId = useId();
  const labelNameId = useId();
  const labelColorId = useId();

  const [name, setName] = useState('');
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState('#6366f1');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const workspace = data?.workspace;
  const canManage = canManageWorkspace(workspace?.currentUserRole);
  const workspaceName = workspace?.name ?? '';

  if (isLoading || !workspace) {
    return <LoadingScreen message="Loading workspace settings..." />;
  }

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] }),
      queryClient.invalidateQueries({ queryKey: ['labels', workspaceId] }),
    ]);
  }

  async function saveWorkspace(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api(`/workspaces/${workspaceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: (name || workspaceName).trim() }),
      });
      await refresh();
      showToast('Workspace updated', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to save');
    } finally {
      setSaving(false);
    }
  }

  async function deleteWorkspace() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      await api(`/workspaces/${workspaceId}`, { method: 'DELETE' });
      showToast('Workspace deleted', 'success');
      router.push('/dashboard');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to delete');
    }
  }

  async function updateMemberRole(memberId: string, role: WorkspaceRole) {
    try {
      await api(`/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      await refresh();
      showToast('Member role updated', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update role');
    }
  }

  async function removeMember(memberId: string) {
    try {
      await api(`/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'DELETE',
      });
      await refresh();
      showToast('Member removed', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to remove member');
    }
  }

  async function createLabel(event: FormEvent) {
    event.preventDefault();
    try {
      await api(`/workspaces/${workspaceId}/labels`, {
        method: 'POST',
        body: JSON.stringify({ name: labelName.trim(), color: labelColor }),
      });
      setLabelName('');
      await refresh();
      showToast('Label created', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to create label');
    }
  }

  async function deleteLabel(labelId: string) {
    try {
      await api(`/workspaces/${workspaceId}/labels/${labelId}`, {
        method: 'DELETE',
      });
      await refresh();
      showToast('Label deleted', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to delete label');
    }
  }

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: workspace.name, href: `/workspaces/${workspaceId}` },
        { label: 'Settings' },
      ]}
    >
      <h1 className="text-3xl font-bold text-foreground">Workspace settings</h1>

      {!canManage && (
        <p className="mt-4 text-muted">
          You need admin access to manage this workspace.
        </p>
      )}

      <div className="mt-8 space-y-8">
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold">General</h2>
          <form onSubmit={saveWorkspace} className="mt-4 flex max-w-md flex-col gap-4">
            <div>
              <Label htmlFor={nameId}>Workspace name</Label>
              <Input
                id={nameId}
                value={name || workspaceName}
                onChange={(event) => setName(event.target.value)}
                disabled={!canManage}
                required
              />
            </div>
            {canManage && (
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
            )}
          </form>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Members</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-border bg-surface-muted/60">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  {canManage && <th className="px-4 py-3 font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {(data?.members ?? []).map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    canManage={canManage}
                    isOwner={isWorkspaceOwner(workspace.currentUserRole)}
                    onRoleChange={updateMemberRole}
                    onRemove={removeMember}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {canManage && (
          <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Labels</h2>
            <ul className="mt-4 space-y-2">
              {(labelsQuery.data ?? []).map((label: WorkspaceLabel) => (
                <li
                  key={label.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: `${label.color}22`,
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteLabel(label.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={createLabel}
              className="mt-4 flex flex-wrap items-end gap-3"
            >
              <div>
                <Label htmlFor={labelNameId}>Label name</Label>
                <Input
                  id={labelNameId}
                  value={labelName}
                  onChange={(event) => setLabelName(event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor={labelColorId}>Color</Label>
                <Input
                  id={labelColorId}
                  type="color"
                  value={labelColor}
                  onChange={(event) => setLabelColor(event.target.value)}
                />
              </div>
              <Button type="submit">Add label</Button>
            </form>
          </section>
        )}

        {isWorkspaceOwner(workspace.currentUserRole) && (
          <section className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-6">
            <h2 className="text-lg font-semibold text-destructive">Danger zone</h2>
            <p className="mt-2 text-sm text-muted">
              Deleting this workspace removes all projects and tasks permanently.
            </p>
            <Button
              variant={confirmDelete ? 'destructive-solid' : 'destructive'}
              className="mt-4"
              onClick={deleteWorkspace}
            >
              {confirmDelete ? 'Confirm delete workspace' : 'Delete workspace'}
            </Button>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function MemberRow({
  member,
  canManage,
  isOwner,
  onRoleChange,
  onRemove,
}: {
  member: WorkspaceMember;
  canManage: boolean;
  isOwner: boolean;
  onRoleChange: (memberId: string, role: WorkspaceRole) => void;
  onRemove: (memberId: string) => void;
}) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-3 font-medium">{member.user.name}</td>
      <td className="px-4 py-3 text-muted">{member.user.email}</td>
      <td className="px-4 py-3">
        {canManage && member.role !== 'OWNER' ? (
          <Select
            value={member.role}
            onChange={(event) =>
              onRoleChange(member.id, event.target.value as WorkspaceRole)
            }
            aria-label={`Role for ${member.user.name}`}
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </Select>
        ) : (
          <Badge variant="info">{member.role}</Badge>
        )}
      </td>
      {canManage && (
        <td className="px-4 py-3">
          {member.role !== 'OWNER' && isOwner && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onRemove(member.id)}
            >
              Remove
            </Button>
          )}
        </td>
      )}
    </tr>
  );
}

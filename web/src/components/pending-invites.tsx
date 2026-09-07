'use client';

import { api } from '@/lib/api';
import { WorkspaceInvite } from '@/types/notification';
import { useToast } from '@/components/toast-provider';

interface PendingInvitesProps {
  invites: WorkspaceInvite[];
  onAccepted: () => void;
}

export function PendingInvites({ invites, onAccepted }: PendingInvitesProps) {
  const { showToast } = useToast();

  if (invites.length === 0) {
    return null;
  }

  async function acceptInvite(token: string) {
    try {
      await api(`/invites/${token}/accept`, { method: 'POST' });
      showToast('Invite accepted', 'success');
      onAccepted();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Unable to accept invite',
      );
    }
  }

  return (
    <section className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <h2 className="font-semibold text-blue-900">Pending invitations</h2>
      <ul className="mt-3 space-y-2">
        {invites.map((invite) => (
          <li
            key={invite.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded bg-white p-3"
          >
            <div>
              <p className="font-medium">{invite.workspace.name}</p>
              <p className="text-sm text-gray-500">
                Invited by {invite.invitedBy.name} as {invite.role}
              </p>
            </div>
            <button
              onClick={() => acceptInvite(invite.token)}
              className="rounded bg-black px-3 py-1.5 text-sm text-white"
            >
              Accept
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

'use client';

import { api } from '@/lib/api';
import { WorkspaceInvite } from '@/types/notification';
import { useToast } from '@/components/toast-provider';
import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';

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

  async function declineInvite(token: string) {
    try {
      await api(`/invites/${token}/decline`, { method: 'POST' });
      showToast('Invite declined', 'success');
      onAccepted();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Unable to decline invite',
      );
    }
  }

  return (
    <section
      aria-labelledby="pending-invites-title"
      className="mb-8 rounded-xl border-2 border-info/30 bg-info/10 p-4"
    >
      <CardTitle id="pending-invites-title" className="text-info">
        Pending invitations
      </CardTitle>
      <ul className="mt-3 space-y-2">
        {invites.map((invite) => (
          <li
            key={invite.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 shadow-sm"
          >
            <div>
              <p className="font-semibold text-foreground">{invite.workspace.name}</p>
              <p className="text-sm text-muted">
                Invited by {invite.invitedBy.name} as {invite.role}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => declineInvite(invite.token)}
              >
                Decline
              </Button>
              <Button size="sm" onClick={() => acceptInvite(invite.token)}>
                Accept
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

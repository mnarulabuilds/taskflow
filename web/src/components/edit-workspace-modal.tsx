'use client';

import { FormEvent, useId, useState } from 'react';

import { Modal } from '@/components/modal';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EditWorkspaceModalProps {
  name: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function EditWorkspaceModal({
  name: initialName,
  onClose,
  onSubmit,
  onDelete,
}: EditWorkspaceModalProps) {
  const nameId = useId();
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await onSubmit(name.trim());
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to update workspace',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) {
      return;
    }

    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete workspace',
      );
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal title="Workspace settings" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor={nameId}>Name</Label>
          <Input
            id={nameId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
          />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex items-center justify-between gap-2">
          {onDelete && (
            <Button
              type="button"
              variant={confirmDelete ? 'destructive-solid' : 'destructive'}
              onClick={handleDelete}
              disabled={deleting || submitting}
            >
              {deleting
                ? 'Deleting...'
                : confirmDelete
                  ? 'Confirm delete'
                  : 'Delete workspace'}
            </Button>
          )}

          <div className="ml-auto flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || deleting}>
              {submitting ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

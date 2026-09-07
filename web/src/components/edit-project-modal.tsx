'use client';

import { FormEvent, useId, useState } from 'react';

import { Modal } from '@/components/modal';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface EditProjectModalProps {
  name: string;
  description?: string | null;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string | null }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function EditProjectModal({
  name: initialName,
  description: initialDescription,
  onClose,
  onSubmit,
  onDelete,
}: EditProjectModalProps) {
  const nameId = useId();
  const descriptionId = useId();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
      });
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to update project',
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
          : 'Unable to delete project',
      );
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal title="Project settings" onClose={onClose}>
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

        <div>
          <Label htmlFor={descriptionId}>Description</Label>
          <Textarea
            id={descriptionId}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
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
                  : 'Delete project'}
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

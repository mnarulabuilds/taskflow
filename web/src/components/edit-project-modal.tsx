'use client';

import { FormEvent, useState } from 'react';

import { Modal } from '@/components/modal';

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
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded border p-2"
            required
            minLength={2}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded border p-2"
            rows={3}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between">
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || submitting}
              className={`rounded border px-4 py-2 text-sm disabled:opacity-50 ${
                confirmDelete
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-red-200 text-red-600'
              }`}
            >
              {deleting
                ? 'Deleting...'
                : confirmDelete
                  ? 'Confirm delete'
                  : 'Delete project'}
            </button>
          )}

          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || deleting}
              className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

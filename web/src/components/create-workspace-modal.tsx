'use client';

import { FormEvent, useState } from 'react';

import { Modal } from '@/components/modal';

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

export function CreateWorkspaceModal({
  onClose,
  onSubmit,
}: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
          : 'Unable to create workspace',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New workspace" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded border p-2"
            placeholder="My workspace"
            required
            minLength={2}
            autoFocus
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create workspace'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

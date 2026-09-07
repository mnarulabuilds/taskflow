'use client';

import { FormEvent, useState } from 'react';

import { Modal } from '@/components/modal';

interface CreateProjectModalProps {
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string }) => Promise<void>;
}

export function CreateProjectModal({
  onClose,
  onSubmit,
}: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to create project',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New project" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded border p-2"
            placeholder="Website redesign"
            required
            minLength={2}
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded border p-2"
            rows={3}
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
            {submitting ? 'Creating...' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

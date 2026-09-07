'use client';

import { FormEvent, useState } from 'react';

import { Modal } from '@/components/modal';
import { TaskStatus } from '@/types/task';

interface CreateTaskModalProps {
  status: TaskStatus;
  onClose: () => void;
  onSubmit: (title: string) => Promise<void>;
}

export function CreateTaskModal({
  status,
  onClose,
  onSubmit,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const statusLabel =
    status === 'TODO'
      ? 'Todo'
      : status === 'IN_PROGRESS'
        ? 'In Progress'
        : 'Done';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await onSubmit(title.trim());
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to create task',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`New task — ${statusLabel}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded border p-2"
            placeholder="Write documentation"
            required
            minLength={3}
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
            {submitting ? 'Creating...' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

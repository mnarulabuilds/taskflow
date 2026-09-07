'use client';

import { FormEvent, useId, useState } from 'react';

import { Modal } from '@/components/modal';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { STATUS_LABELS } from '@/lib/task-styles';
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
  const titleId = useId();
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
    <Modal title={`New task — ${STATUS_LABELS[status]}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor={titleId}>Title</Label>
          <Input
            id={titleId}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Write documentation"
            required
            minLength={3}
            autoFocus
          />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

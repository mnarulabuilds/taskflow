'use client';

import { FormEvent, useEffect, useId, useState } from 'react';

import { Modal } from '@/components/modal';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { TaskComment } from '@/types/comment';
import { Task, TaskPriority, TaskStatus } from '@/types/task';
import { WorkspaceMember } from '@/types/member';

interface TaskDetailModalProps {
  task: Task;
  projectId: string;
  members: WorkspaceMember[];
  onClose: () => void;
  onUpdated: (task: Task) => void;
  onDeleted: (taskId: string) => void;
}

export function TaskDetailModal({
  task,
  projectId,
  members,
  onClose,
  onUpdated,
  onDeleted,
}: TaskDetailModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const statusId = useId();
  const priorityId = useId();
  const dueDateId = useId();
  const assigneeId = useId();
  const commentId = useId();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? task.dueDate.slice(0, 10) : '',
  );
  const [assignee, setAssignee] = useState(task.assignee?.id ?? '');
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<TaskComment[]>(
      `/projects/${projectId}/tasks/${task.id}/comments`,
    )
      .then(setComments)
      .catch(() => undefined);
  }, [projectId, task.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      const updatedTask = await api<Task>(
        `/projects/${projectId}/tasks/${task.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            status,
            priority,
            dueDate: dueDate || null,
            assigneeId: assignee || null,
          }),
        },
      );

      onUpdated(updatedTask);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to save task',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setError('');
    setDeleting(true);

    try {
      await api(`/projects/${projectId}/tasks/${task.id}`, {
        method: 'DELETE',
      });
      onDeleted(task.id);
      onClose();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Unable to delete task',
      );
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!commentText.trim()) {
      return;
    }

    setPostingComment(true);
    try {
      const comment = await api<TaskComment>(
        `/projects/${projectId}/tasks/${task.id}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({ content: commentText.trim() }),
        },
      );
      setComments((current) => [...current, comment]);
      setCommentText('');
    } catch (commentError) {
      setError(
        commentError instanceof Error
          ? commentError.message
          : 'Unable to add comment',
      );
    } finally {
      setPostingComment(false);
    }
  }

  return (
    <Modal title="Edit task" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor={titleId}>Title</Label>
          <Input
            id={titleId}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            minLength={3}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={statusId}>Status</Label>
            <Select
              id={statusId}
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as TaskStatus)
              }
            >
              <option value="TODO">To do</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="DONE">Done</option>
            </Select>
          </div>
          <div>
            <Label htmlFor={priorityId}>Priority</Label>
            <Select
              id={priorityId}
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as TaskPriority)
              }
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={dueDateId}>Due date</Label>
            <Input
              id={dueDateId}
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={assigneeId}>Assignee</Label>
            <Select
              id={assigneeId}
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <section
          aria-labelledby="comments-heading"
          className="rounded-lg border border-border bg-surface-muted/40 p-4"
        >
          <h3 id="comments-heading" className="text-sm font-semibold text-foreground">
            Comments
          </h3>
          <div className="mt-3 max-h-40 space-y-3 overflow-y-auto">
            {comments.length === 0 && (
              <p className="text-sm text-muted">No comments yet.</p>
            )}
            {comments.map((comment) => (
              <article key={comment.id} className="text-sm">
                <p className="font-semibold text-primary">{comment.author.name}</p>
                <p className="text-foreground">{comment.content}</p>
                <p className="text-xs text-muted">
                  <time dateTime={comment.createdAt}>
                    {new Date(comment.createdAt).toLocaleString()}
                  </time>
                </p>
              </article>
            ))}
          </div>
          <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
            <Label htmlFor={commentId} className="sr-only">
              Add a comment
            </Label>
            <Input
              id={commentId}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Add a comment..."
              className="flex-1 text-sm"
            />
            <Button type="submit" size="sm" disabled={postingComment}>
              Post
            </Button>
          </form>
        </section>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant={confirmDelete ? 'destructive-solid' : 'destructive'}
            onClick={handleDelete}
            disabled={deleting || saving}
          >
            {deleting
              ? 'Deleting...'
              : confirmDelete
                ? 'Confirm delete'
                : 'Delete task'}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || deleting}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

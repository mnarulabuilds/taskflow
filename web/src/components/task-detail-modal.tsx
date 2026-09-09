'use client';

import { FormEvent, useEffect, useId, useRef, useState } from 'react';

import { MarkdownContent } from '@/components/markdown-content';
import { Modal } from '@/components/modal';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLabels } from '@/hooks/use-queries';
import { api } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/task-styles';
import { TaskComment } from '@/types/comment';
import { ALL_STATUSES, Task, TaskPriority, TaskStatus, TaskSubtask } from '@/types/task';
import { WorkspaceMember } from '@/types/member';
import { useToast } from '@/components/toast-provider';

interface TaskDetailModalProps {
  task: Task;
  projectId: string;
  workspaceId: string;
  members: WorkspaceMember[];
  onClose: () => void;
  onUpdated: (task: Task) => void;
  onDeleted: (taskId: string) => void;
}

export function TaskDetailModal({
  task,
  projectId,
  workspaceId,
  members,
  onClose,
  onUpdated,
  onDeleted,
}: TaskDetailModalProps) {
  const { showToast } = useToast();
  const labelsQuery = useLabels(workspaceId);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const statusId = useId();
  const priorityId = useId();
  const dueDateId = useId();
  const assigneeId = useId();
  const commentId = useId();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [showPreview, setShowPreview] = useState(false);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? task.dueDate.slice(0, 10) : '',
  );
  const [assignee, setAssignee] = useState(task.assignee?.id ?? '');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(
    task.labels?.map((label) => label.id) ?? [],
  );
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>(task.subtasks ?? []);
  const [newSubtask, setNewSubtask] = useState('');
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<TaskComment[]>(
      `/projects/${projectId}/tasks/${task.id}/comments`,
    )
      .then(setComments)
      .catch(() => undefined);

    api<TaskSubtask[]>(
      `/projects/${projectId}/tasks/${task.id}/subtasks`,
    )
      .then(setSubtasks)
      .catch(() => undefined);

    return () => {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
    };
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
            labelIds: selectedLabelIds,
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

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setError('');
    onClose();

    showToast('Task deleted', {
      type: 'info',
      action: {
        label: 'Undo',
        onClick: () => {
          if (deleteTimeoutRef.current) {
            clearTimeout(deleteTimeoutRef.current);
            deleteTimeoutRef.current = null;
          }
        },
      },
      duration: 5000,
    });

    deleteTimeoutRef.current = setTimeout(async () => {
      try {
        await api(`/projects/${projectId}/tasks/${task.id}`, {
          method: 'DELETE',
        });
        onDeleted(task.id);
      } catch (deleteError) {
        showToast(
          deleteError instanceof Error
            ? deleteError.message
            : 'Unable to delete task',
        );
      }
    }, 5000);
  }

  async function handleAddSubtask(event: FormEvent) {
    event.preventDefault();
    if (!newSubtask.trim()) {
      return;
    }

    try {
      const subtask = await api<TaskSubtask>(
        `/projects/${projectId}/tasks/${task.id}/subtasks`,
        {
          method: 'POST',
          body: JSON.stringify({ title: newSubtask.trim() }),
        },
      );
      setSubtasks((current) => [...current, subtask]);
      setNewSubtask('');
    } catch (subtaskError) {
      setError(
        subtaskError instanceof Error
          ? subtaskError.message
          : 'Unable to add subtask',
      );
    }
  }

  async function toggleSubtask(subtask: TaskSubtask) {
    try {
      const updated = await api<TaskSubtask>(
        `/projects/${projectId}/tasks/${task.id}/subtasks/${subtask.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ completed: !subtask.completed }),
        },
      );
      setSubtasks((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : 'Unable to update subtask',
      );
    }
  }

  async function deleteSubtask(subtaskId: string) {
    try {
      await api(
        `/projects/${projectId}/tasks/${task.id}/subtasks/${subtaskId}`,
        { method: 'DELETE' },
      );
      setSubtasks((current) => current.filter((item) => item.id !== subtaskId));
    } catch (deleteSubtaskError) {
      setError(
        deleteSubtaskError instanceof Error
          ? deleteSubtaskError.message
          : 'Unable to delete subtask',
      );
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

  function toggleLabel(labelId: string) {
    setSelectedLabelIds((current) =>
      current.includes(labelId)
        ? current.filter((id) => id !== labelId)
        : [...current, labelId],
    );
  }

  return (
    <Modal
      title="Edit task"
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant={confirmDelete ? 'destructive-solid' : 'destructive'}
            onClick={handleDelete}
            disabled={saving}
          >
            {confirmDelete ? 'Confirm delete' : 'Delete task'}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
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
          <div className="mb-2 flex items-center justify-between">
            <Label htmlFor={descriptionId}>Description</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview((value) => !value)}
            >
              {showPreview ? 'Edit' : 'Preview'}
            </Button>
          </div>
          {showPreview ? (
            <div className="min-h-24 rounded-lg border border-border bg-surface-muted/40 p-3">
              {description.trim() ? (
                <MarkdownContent content={description} />
              ) : (
                <p className="text-sm text-muted">No description.</p>
              )}
            </div>
          ) : (
            <Textarea
              id={descriptionId}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Supports **bold**, *italic*, `code`, links, and lists"
            />
          )}
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
              {ALL_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
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

        {(labelsQuery.data ?? []).length > 0 && (
          <fieldset>
            <legend className="text-sm font-medium text-foreground">Labels</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(labelsQuery.data ?? []).map((label) => {
                const selected = selectedLabelIds.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label.id)}
                    className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                    style={{
                      borderColor: label.color,
                      backgroundColor: selected ? `${label.color}33` : 'transparent',
                      color: label.color,
                    }}
                    aria-pressed={selected}
                  >
                    {label.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <section className="rounded-lg border border-border bg-surface-muted/40 p-4">
          <h3 className="text-sm font-semibold text-foreground">Subtasks</h3>
          <ul className="mt-3 space-y-2">
            {subtasks.length === 0 && (
              <li className="text-sm text-muted">No subtasks yet.</li>
            )}
            {subtasks.map((subtask) => (
              <li key={subtask.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={subtask.completed}
                  onChange={() => toggleSubtask(subtask)}
                  aria-label={`Mark ${subtask.title} complete`}
                />
                <span
                  className={
                    subtask.completed ? 'text-muted line-through' : 'text-foreground'
                  }
                >
                  {subtask.title}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => deleteSubtask(subtask.id)}
                  aria-label={`Delete subtask ${subtask.title}`}
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
          <form onSubmit={handleAddSubtask} className="mt-3 flex gap-2">
            <Input
              value={newSubtask}
              onChange={(event) => setNewSubtask(event.target.value)}
              placeholder="Add subtask..."
              className="flex-1 text-sm"
            />
            <Button type="submit" size="sm">
              Add
            </Button>
          </form>
        </section>

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
      </form>
    </Modal>
  );
}

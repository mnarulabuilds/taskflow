'use client';

import { FormEvent, useEffect, useState } from 'react';

import { Modal } from '@/components/modal';
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
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? task.dueDate.slice(0, 10) : '',
  );
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id ?? '');
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
            assigneeId: assigneeId || null,
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
    <Modal title="Edit task" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded border p-2"
            required
            minLength={3}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as TaskStatus)
              }
              className="w-full rounded border p-2"
            >
              <option value="TODO">Todo</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Priority</label>
            <select
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as TaskPriority)
              }
              className="w-full rounded border p-2"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="w-full rounded border p-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Assignee</label>
            <select
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              className="w-full rounded border p-2"
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <section className="rounded border p-3">
          <h3 className="text-sm font-medium">Comments</h3>
          <div className="mt-3 max-h-40 space-y-3 overflow-y-auto">
            {comments.length === 0 && (
              <p className="text-sm text-gray-500">No comments yet.</p>
            )}
            {comments.map((comment) => (
              <article key={comment.id} className="text-sm">
                <p className="font-medium">{comment.author.name}</p>
                <p className="text-gray-700">{comment.content}</p>
                <p className="text-xs text-gray-400">
                  {new Date(comment.createdAt).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
          <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
            <input
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Add a comment..."
              className="flex-1 rounded border p-2 text-sm"
            />
            <button
              type="submit"
              disabled={postingComment}
              className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              Post
            </button>
          </form>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
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
                : 'Delete task'}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || deleting}
              className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

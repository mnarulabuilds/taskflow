'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Modal } from '@/components/modal';
import { Input } from '@/components/ui/input';
import { useWorkspaces } from '@/hooks/use-queries';
import { cn } from '@/lib/cn';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  href?: string;
  action?: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const workspacesQuery = useWorkspaces();

  const items = useMemo(() => {
    const results: CommandItem[] = [
      {
        id: 'new-task',
        label: 'Create new task',
        description: 'Open project board to add a task',
        href: '/dashboard',
      },
    ];

    const workspaces = workspacesQuery.data ?? [];
    const normalized = query.trim().toLowerCase();

    for (const workspace of workspaces) {
      if (
        !normalized ||
        workspace.name.toLowerCase().includes(normalized)
      ) {
        results.push({
          id: `workspace-${workspace.id}`,
          label: workspace.name,
          description: 'Workspace',
          href: `/workspaces/${workspace.id}`,
        });
      }
    }

    return results.filter((item) => {
      if (!normalized) {
        return true;
      }
      return (
        item.label.toLowerCase().includes(normalized) ||
        item.description?.toLowerCase().includes(normalized)
      );
    });
  }, [query, workspacesQuery.data]);

  const activeIndex = Math.min(
    selectedIndex,
    Math.max(items.length - 1, 0),
  );

  const runItem = useCallback(
    (item: CommandItem) => {
      if (item.action) {
        item.action();
      } else if (item.href) {
        router.push(item.href);
      }
      onClose();
      setQuery('');
    },
    [onClose, router],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((index) => Math.min(index + 1, items.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === 'Enter' && items[activeIndex]) {
        event.preventDefault();
        runItem(items[activeIndex]);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, items, activeIndex, runItem]);

  if (!open) {
    return null;
  }

  return (
    <Modal title="Command palette" onClose={onClose} size="lg">
      <Input
        autoFocus
        placeholder="Search workspaces, projects, actions..."
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelectedIndex(0);
        }}
        aria-label="Command search"
      />
      <ul className="mt-4 max-h-80 overflow-y-auto" role="listbox">
        {items.length === 0 && (
          <li className="px-3 py-2 text-sm text-muted">No results found.</li>
        )}
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                'flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors',
                index === activeIndex
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-surface-muted',
              )}
              onClick={() => runItem(item)}
            >
              <span className="font-medium">{item.label}</span>
              {item.description && (
                <span className="text-xs text-muted">{item.description}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">
        Tip: use <kbd className="rounded bg-surface-muted px-1">↑</kbd>{' '}
        <kbd className="rounded bg-surface-muted px-1">↓</kbd> to navigate,{' '}
        <kbd className="rounded bg-surface-muted px-1">Enter</kbd> to select
      </p>
    </Modal>
  );
}

export function CommandPaletteTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-muted sm:inline-flex"
      aria-label="Open command palette"
    >
      <span>Search...</span>
      <kbd className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">⌘K</kbd>
    </button>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    open,
    setOpen,
    close: () => setOpen(false),
  };
}

'use client';

import { ReactNode, useEffect, useState } from 'react';

import { Modal } from '@/components/modal';

const SHORTCUTS = [
  { keys: 'N', description: 'Create new task (on project page)' },
  { keys: '/', description: 'Focus search / filters' },
  { keys: '?', description: 'Show keyboard shortcuts' },
  { keys: 'Esc', description: 'Close open modal or dialog' },
  { keys: '⌘ K', description: 'Open command palette' },
];

export function KeyboardShortcuts({ children }: { children: ReactNode }) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (isInput && event.key !== 'Escape') {
        return;
      }

      if (event.key === '?' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setShowHelp(true);
        return;
      }

      if (event.key === '/' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          '#task-search, [data-search-input="true"]',
        );
        searchInput?.focus();
        return;
      }

      if (event.key === 'n' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('taskflow:new-task'));
        return;
      }

      if (event.key === 'Escape') {
        setShowHelp(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {children}
      {showHelp && (
        <Modal title="Keyboard shortcuts" onClose={() => setShowHelp(false)}>
          <ul className="space-y-3">
            {SHORTCUTS.map((shortcut) => (
              <li
                key={shortcut.keys}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="text-muted">{shortcut.description}</span>
                <kbd className="rounded-lg border border-border bg-surface-muted px-2 py-1 font-mono text-xs">
                  {shortcut.keys}
                </kbd>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </>
  );
}

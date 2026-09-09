'use client';

import { cn } from '@/lib/cn';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseInline(text: string) {
  let result = escapeHtml(text);

  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-primary underline hover:text-primary-hover" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  result = result.replace(/`([^`]+)`/g, '<code class="rounded bg-surface-muted px-1 py-0.5 font-mono text-sm">$1</code>');
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  return result;
}

function parseMarkdown(content: string) {
  const lines = content.split('\n');
  const html: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      continue;
    }

    if (/^[-*]\s/.test(trimmed)) {
      if (!inList) {
        html.push('<ul class="list-disc pl-5 space-y-1">');
        inList = true;
      }
      html.push(`<li>${parseInline(trimmed.replace(/^[-*]\s/, ''))}</li>`);
      continue;
    }

    if (inList) {
      html.push('</ul>');
      inList = false;
    }

    html.push(`<p class="mb-2 last:mb-0">${parseInline(trimmed)}</p>`);
  }

  if (inList) {
    html.push('</ul>');
  }

  return html.join('');
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  if (!content.trim()) {
    return null;
  }

  return (
    <div
      className={cn('prose-sm text-foreground', className)}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
}

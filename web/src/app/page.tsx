import Link from 'next/link';

import { buttonLinkClasses } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-100 via-violet-50 to-teal-100 px-6">
      <div className="max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          Team task management
        </p>
        <h1 className="mt-3 text-5xl font-bold tracking-tight text-foreground">
          Organize work with{' '}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            TaskFlow
          </span>
        </h1>
        <p className="mt-5 text-lg text-muted">
          Workspaces, projects, and colorful Kanban boards — built for focused
          teams who need clarity and speed.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/login" className={buttonLinkClasses('primary', 'lg')}>
            Sign in
          </Link>
          <Link href="/register" className={buttonLinkClasses('secondary', 'lg')}>
            Create account
          </Link>
        </div>

        <ul className="mt-12 grid gap-4 text-left sm:grid-cols-3">
          {[
            { title: 'Workspaces', desc: 'Separate teams and contexts' },
            { title: 'Kanban boards', desc: 'Drag tasks through stages' },
            { title: 'Collaboration', desc: 'Comments, invites, activity' },
          ].map((item) => (
            <li
              key={item.title}
              className="rounded-xl border border-border bg-surface/80 p-4 shadow-sm backdrop-blur"
            >
              <h2 className="font-semibold text-primary">{item.title}</h2>
              <p className="mt-1 text-sm text-muted">{item.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

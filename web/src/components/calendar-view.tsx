'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { Task } from '@/types/task';

interface CalendarViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function CalendarView({ tasks, onSelectTask }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const startDay = start.getDay();
    const days: Date[] = [];

    for (let index = startDay - 1; index >= 0; index -= 1) {
      days.push(
        new Date(start.getFullYear(), start.getMonth(), -index),
      );
    }

    for (let day = 1; day <= end.getDate(); day += 1) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    }

    while (days.length % 7 !== 0) {
      const last = days[days.length - 1];
      days.push(
        new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      );
    }

    return days;
  }, [currentMonth]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();

    for (const task of tasks) {
      if (!task.dueDate) {
        continue;
      }
      const key = task.dueDate.slice(0, 10);
      const existing = map.get(key) ?? [];
      existing.push(task);
      map.set(key, existing);
    }

    return map;
  }, [tasks]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {currentMonth.toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          })}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
              )
            }
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
              )
            }
          >
            Next
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const inMonth = day.getMonth() === currentMonth.getMonth();
          const key = day.toISOString().slice(0, 10);
          const dayTasks = tasksByDay.get(key) ?? [];
          const isToday = sameDay(day, today);

          return (
            <div
              key={key}
              className={cn(
                'min-h-24 rounded-lg border border-border p-1 text-left',
                inMonth ? 'bg-surface' : 'bg-surface-muted/30 text-muted',
                isToday && 'ring-2 ring-primary',
              )}
            >
              <span className="text-xs font-medium">{day.getDate()}</span>
              <ul className="mt-1 space-y-1">
                {dayTasks.slice(0, 3).map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      className="w-full truncate text-left"
                      onClick={() => onSelectTask(task)}
                    >
                      <Badge variant="info" className="max-w-full truncate text-xs">
                        {task.title}
                      </Badge>
                    </button>
                  </li>
                ))}
                {dayTasks.length > 3 && (
                  <li className="text-xs text-muted">+{dayTasks.length - 3} more</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

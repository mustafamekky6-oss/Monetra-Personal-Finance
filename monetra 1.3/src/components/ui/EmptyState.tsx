import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-(--radius-card) border border-dashed border-lift/12 px-6 py-14 text-center">
      <span className="text-muted">{icon ?? <Inbox size={28} aria-hidden />}</span>
      <h3 className="font-display text-[20px] leading-tight text-heading">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-body">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

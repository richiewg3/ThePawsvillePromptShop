"use client";

import { useState } from "react";

interface ManagerCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export function ManagerCard({
  title,
  subtitle,
  children,
  onEdit,
  onDuplicate,
  onDelete,
}: ManagerCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="card card-hover p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-semibold text-canvas-800 truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-canvas-500 mt-0.5 line-clamp-1">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onEdit && (
            <button
              onClick={onEdit}
              className="btn-ghost p-2 rounded-lg"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={onDuplicate}
              className="btn-ghost p-2 rounded-lg"
              title="Duplicate"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
          {onDelete && !showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-ghost p-2 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          {showDeleteConfirm && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  onDelete?.();
                  setShowDeleteConfirm(false);
                }}
                className="btn btn-primary text-xs py-1 px-2 bg-red-500 hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-secondary text-xs py-1 px-2"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="text-sm text-canvas-600">{children}</div>
    </div>
  );
}

interface ManagerHeaderProps {
  title: string;
  description: string;
  icon: string;
  onAdd: () => void;
  addLabel?: string;
}

export function ManagerHeader({
  title,
  description,
  icon,
  onAdd,
  addLabel = "Add New",
}: ManagerHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-canvas-800 flex items-center gap-3">
          <span className="text-4xl">{icon}</span>
          {title}
        </h1>
        <p className="text-canvas-600 mt-2 max-w-2xl">{description}</p>
      </div>
      <button onClick={onAdd} className="btn btn-primary flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {addLabel}
      </button>
    </div>
  );
}

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="card p-12 text-center">
      <span className="text-6xl mb-4 block">{icon}</span>
      <h3 className="font-display text-xl font-semibold text-canvas-700 mb-2">
        {title}
      </h3>
      <p className="text-canvas-500 mb-6 max-w-sm mx-auto">{description}</p>
      <button onClick={onAction} className="btn btn-primary">
        {actionLabel}
      </button>
    </div>
  );
}

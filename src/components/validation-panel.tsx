"use client";

import { ValidationError } from "@/lib/schemas";

interface ValidationPanelProps {
  errors: ValidationError[];
  onRunQA?: () => void;
  isLoadingQA?: boolean;
}

export function ValidationPanel({
  errors,
  onRunQA,
  isLoadingQA,
}: ValidationPanelProps) {
  const hardErrors = errors.filter((e) => e.type === "hard");
  const softWarnings = errors.filter((e) => e.type === "soft");

  const hasErrors = hardErrors.length > 0;
  const hasWarnings = softWarnings.length > 0;

  if (!hasErrors && !hasWarnings) {
    return (
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
        <div className="flex items-center gap-2 text-emerald-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">All validations passed</span>
        </div>
        {onRunQA && (
          <button
            type="button"
            onClick={onRunQA}
            disabled={isLoadingQA}
            className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
          >
            {isLoadingQA ? "Running QA..." : "✨ Run AI QA Check"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Hard errors */}
      {hasErrors && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cannot compile ({hardErrors.length})
          </h4>
          <ul className="space-y-1">
            {hardErrors.map((error, i) => (
              <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Soft warnings */}
      {hasWarnings && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Warnings ({softWarnings.length})
          </h4>
          <ul className="space-y-1">
            {softWarnings.map((warning, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* QA Button */}
      {onRunQA && (
        <button
          type="button"
          onClick={onRunQA}
          disabled={isLoadingQA}
          className="text-sm text-paw-600 hover:text-paw-700 disabled:opacity-50"
        >
          {isLoadingQA ? "Running QA..." : "✨ Run AI QA Check for more suggestions"}
        </button>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

interface PromptPreviewProps {
  compiledText: string;
  seedSummary: string;
  lensSource: "auto" | "manual";
  lensWarning?: string;
  canCompile: boolean;
}

export function PromptPreview({
  compiledText,
  seedSummary,
  lensSource,
  lensWarning,
  canCompile,
}: PromptPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(compiledText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="card p-5 sticky top-20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-canvas-800">
          Live Preview
        </h3>
        <button
          onClick={handleCopy}
          disabled={!canCompile}
          className={`btn text-sm ${
            copied ? "btn-primary bg-emerald-500 hover:bg-emerald-600" : "btn-primary"
          } disabled:opacity-50`}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy Prompt
            </>
          )}
        </button>
      </div>

      {/* Lens info */}
      <div className="flex items-center gap-2 mb-3">
        <span className="badge badge-paw">
          Lens: {lensSource === "auto" ? "Auto (Look Default)" : "Manual"}
        </span>
        {lensWarning && (
          <span className="badge badge-warning">{lensWarning}</span>
        )}
      </div>

      {/* Seed summary */}
      <div className="mb-4 p-2 bg-paw-50 rounded-lg text-sm text-paw-800 font-mono">
        {seedSummary || "Seed summary will appear here..."}
      </div>

      {/* Prompt text */}
      <div className="relative">
        {!canCompile ? (
          <div className="p-8 text-center text-canvas-400 bg-canvas-50 rounded-xl border border-dashed border-canvas-300">
            <p className="text-lg mb-2">🚧</p>
            <p>Fix validation errors to see the compiled prompt</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto bg-canvas-50 rounded-xl p-4 border border-canvas-200">
            <pre className="prompt-preview">{compiledText}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

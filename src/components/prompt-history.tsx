"use client";

import { useState } from "react";
import { PromptHistoryEntry } from "@/lib/azure-storage";

interface PromptHistoryProps {
  history: PromptHistoryEntry[];
  onRestore: (historyId: string) => void;
  onSaveSnapshot: (note?: string) => void;
}

export function PromptHistory({
  history,
  onRestore,
  onSaveSnapshot,
}: PromptHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [snapshotNote, setSnapshotNote] = useState("");
  const [showSnapshotForm, setShowSnapshotForm] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleSaveSnapshot = () => {
    onSaveSnapshot(snapshotNote.trim() || undefined);
    setSnapshotNote("");
    setShowSnapshotForm(false);
  };

  const handleRestore = (id: string) => {
    if (!confirm("Restore this version? Your current work will be replaced (but saved to history first).")) {
      return;
    }
    setRestoringId(id);
    // Save current state to history before restoring
    onSaveSnapshot("Auto-saved before restore");
    setTimeout(() => {
      onRestore(id);
      setRestoringId(null);
    }, 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPreviewText = (entry: PromptHistoryEntry): string => {
    const pr = entry.promptRequest;
    const parts: string[] = [];
    
    if (pr.sceneHeart) {
      parts.push(pr.sceneHeart.slice(0, 50) + (pr.sceneHeart.length > 50 ? "..." : ""));
    }
    if (pr.mechanicLock) {
      parts.push(`Mechanic: ${pr.mechanicLock.slice(0, 30)}...`);
    }
    
    return parts.join(" | ") || "Empty prompt";
  };

  return (
    <div className="border border-canvas-200 rounded-xl overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-canvas-50 hover:bg-canvas-100 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-5 h-5 text-canvas-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium text-canvas-700">History</span>
          {history.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-canvas-200 text-canvas-600">
              {history.length} {history.length === 1 ? "version" : "versions"}
            </span>
          )}
        </div>
        {!isExpanded && history.length > 0 && (
          <span className="text-xs text-canvas-500">
            Last saved {formatDate(history[0].savedAt)}
          </span>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-canvas-200">
          {/* Save Snapshot Button */}
          <div className="p-3 bg-white border-b border-canvas-100">
            {showSnapshotForm ? (
              <div className="space-y-2">
                <input
                  type="text"
                  className="input w-full text-sm"
                  placeholder="Optional note (e.g., 'Before major changes')..."
                  value={snapshotNote}
                  onChange={(e) => setSnapshotNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveSnapshot();
                    if (e.key === "Escape") setShowSnapshotForm(false);
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSnapshot}
                    className="btn btn-sm btn-primary flex-1"
                  >
                    Save Snapshot
                  </button>
                  <button
                    onClick={() => {
                      setShowSnapshotForm(false);
                      setSnapshotNote("");
                    }}
                    className="btn btn-sm btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSnapshotForm(true)}
                className="btn btn-secondary btn-sm w-full"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Current as Snapshot
              </button>
            )}
          </div>

          {/* History List */}
          {history.length === 0 ? (
            <div className="p-6 text-center text-canvas-500">
              <div className="text-3xl mb-2">&#128197;</div>
              <p className="text-sm">No history yet</p>
              <p className="text-xs mt-1">Save snapshots to track versions of your prompt</p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto divide-y divide-canvas-100">
              {history.map((entry, index) => (
                <div
                  key={entry.id}
                  className="p-3 hover:bg-canvas-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-canvas-500 font-mono">
                          #{history.length - index}
                        </span>
                        <span className="text-sm text-canvas-700">
                          {formatDate(entry.savedAt)}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-sm font-medium text-canvas-800 mt-0.5">
                          {entry.note}
                        </p>
                      )}
                      <p className="text-xs text-canvas-500 mt-1 truncate">
                        {getPreviewText(entry)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestore(entry.id)}
                      disabled={restoringId === entry.id}
                      className="btn btn-sm btn-secondary shrink-0"
                    >
                      {restoringId === entry.id ? (
                        <span className="animate-spin">&#9203;</span>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Restore
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

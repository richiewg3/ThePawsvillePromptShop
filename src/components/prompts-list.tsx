"use client";

import { useState } from "react";
import { Project, ProjectPrompt } from "@/lib/azure-storage";

interface PromptsListProps {
  project: Project;
  currentPromptId: string | null;
  onOpenPrompt: (id: string) => void;
  onCreatePrompt: (title: string) => void;
  onDeletePrompt: (id: string) => void;
  onRenamePrompt: (id: string, title: string) => void;
  onDuplicatePrompt: (id: string) => void;
  onCloseProject: () => Promise<void>;
  onRenameProject: (name: string) => void;
  storageMode: "azure" | "local";
  isSaving: boolean;
  lastSaved: Date | null;
  onSaveNow: () => Promise<boolean>;
}

export function PromptsList({
  project,
  currentPromptId,
  onOpenPrompt,
  onCreatePrompt,
  onDeletePrompt,
  onRenamePrompt,
  onDuplicatePrompt,
  onCloseProject,
  onRenameProject,
  storageMode,
  isSaving,
  lastSaved,
  onSaveNow,
}: PromptsListProps) {
  const [newPromptTitle, setNewPromptTitle] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState(project.name);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptTitleInput, setPromptTitleInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  const handleManualSave = async () => {
    setSaveStatus("saving");
    const success = await onSaveNow();
    setSaveStatus(success ? "success" : "error");
    // Reset status after 2 seconds
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const handleCreatePrompt = () => {
    if (!newPromptTitle.trim()) return;
    onCreatePrompt(newPromptTitle.trim());
    setNewPromptTitle("");
    setShowCreateForm(false);
  };

  const handleRenameProject = () => {
    if (!projectNameInput.trim()) return;
    onRenameProject(projectNameInput.trim());
    setEditingProjectName(false);
  };

  const handleStartRenamePrompt = (prompt: ProjectPrompt) => {
    setEditingPromptId(prompt.id);
    setPromptTitleInput(prompt.title);
  };

  const handleRenamePrompt = () => {
    if (!editingPromptId || !promptTitleInput.trim()) return;
    onRenamePrompt(editingPromptId, promptTitleInput.trim());
    setEditingPromptId(null);
    setPromptTitleInput("");
  };

  const handleDeletePrompt = (id: string, title: string) => {
    if (!confirm(`Delete prompt "${title}"? This cannot be undone.`)) return;
    onDeletePrompt(id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatLastSaved = () => {
    if (!lastSaved) return "Not saved yet";
    const diff = Date.now() - lastSaved.getTime();
    if (diff < 60000) return "Saved just now";
    if (diff < 3600000) return `Saved ${Math.floor(diff / 60000)}m ago`;
    return `Saved at ${lastSaved.toLocaleTimeString()}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-canvas-200 bg-canvas-50">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={async () => {
              // Save before closing
              await handleManualSave();
              await onCloseProject();
            }}
            className="text-sm text-canvas-500 hover:text-canvas-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Projects
          </button>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            storageMode === "azure" 
              ? "bg-blue-100 text-blue-700" 
              : "bg-amber-100 text-amber-700"
          }`}>
            {storageMode === "azure" ? "Cloud" : "Local"}
          </span>
        </div>

        {editingProjectName ? (
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1 text-lg font-semibold"
              value={projectNameInput}
              onChange={(e) => setProjectNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameProject();
                if (e.key === "Escape") setEditingProjectName(false);
              }}
              autoFocus
            />
            <button onClick={handleRenameProject} className="btn btn-sm btn-primary">
              Save
            </button>
          </div>
        ) : (
          <h2
            onClick={() => {
              setProjectNameInput(project.name);
              setEditingProjectName(true);
            }}
            className="text-lg font-semibold text-canvas-800 cursor-pointer hover:text-paw-600 transition-colors"
            title="Click to rename"
          >
            {project.name}
          </h2>
        )}

        {/* Save status */}
        <div className="flex items-center gap-2 mt-2 text-xs">
          {saveStatus === "success" ? (
            <span className="text-green-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved!
            </span>
          ) : saveStatus === "error" ? (
            <span className="text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Save failed
            </span>
          ) : (
            <span className={`text-canvas-500 ${isSaving || saveStatus === "saving" ? "animate-pulse" : ""}`}>
              {isSaving || saveStatus === "saving" ? "Saving..." : formatLastSaved()}
            </span>
          )}
          {!isSaving && saveStatus !== "saving" && (
            <button
              onClick={handleManualSave}
              className="text-paw-600 hover:text-paw-700 underline ml-auto"
            >
              Save now
            </button>
          )}
        </div>
      </div>

      {/* Prompts List */}
      <div className="flex-1 overflow-y-auto">
        {/* Create Button */}
        <div className="p-3 border-b border-canvas-100">
          {showCreateForm ? (
            <div className="space-y-2">
              <input
                type="text"
                className="input w-full"
                placeholder="Prompt title..."
                value={newPromptTitle}
                onChange={(e) => setNewPromptTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreatePrompt();
                  if (e.key === "Escape") setShowCreateForm(false);
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreatePrompt}
                  disabled={!newPromptTitle.trim()}
                  className="btn btn-sm btn-primary flex-1"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewPromptTitle("");
                  }}
                  className="btn btn-sm btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn btn-secondary w-full"
            >
              + New Prompt
            </button>
          )}
        </div>

        {/* Prompts */}
        {project.prompts.length === 0 ? (
          <div className="p-6 text-center text-canvas-500">
            <div className="text-3xl mb-2">&#128221;</div>
            <p className="text-sm">No prompts yet</p>
            <p className="text-xs mt-1">Create your first prompt to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-canvas-100">
            {project.prompts.map((prompt) => (
              <div
                key={prompt.id}
                className={`p-3 cursor-pointer transition-colors group ${
                  currentPromptId === prompt.id
                    ? "bg-paw-50 border-l-4 border-l-paw-500"
                    : "hover:bg-canvas-50"
                }`}
                onClick={() => onOpenPrompt(prompt.id)}
              >
                {editingPromptId === prompt.id ? (
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      className="input flex-1 text-sm"
                      value={promptTitleInput}
                      onChange={(e) => setPromptTitleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenamePrompt();
                        if (e.key === "Escape") setEditingPromptId(null);
                      }}
                      autoFocus
                    />
                    <button onClick={handleRenamePrompt} className="btn btn-xs btn-primary">
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-canvas-800 text-sm truncate flex-1">
                        {prompt.title}
                      </h4>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRenamePrompt(prompt);
                          }}
                          className="p-1 text-canvas-400 hover:text-canvas-600 rounded"
                          title="Rename"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicatePrompt(prompt.id);
                          }}
                          className="p-1 text-canvas-400 hover:text-canvas-600 rounded"
                          title="Duplicate"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePrompt(prompt.id, prompt.title);
                          }}
                          className="p-1 text-canvas-400 hover:text-red-500 rounded"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-canvas-500">
                      <span>Updated {formatDate(prompt.updatedAt)}</span>
                      {prompt.history.length > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-canvas-100 text-canvas-600">
                          {prompt.history.length} history
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

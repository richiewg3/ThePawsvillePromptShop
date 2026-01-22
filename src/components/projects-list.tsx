"use client";

import { useState } from "react";
import { ProjectListItem } from "@/lib/azure-storage";

interface ProjectsListProps {
  projects: ProjectListItem[];
  loading: boolean;
  storageMode: "azure" | "local";
  onOpenProject: (id: string) => void;
  onCreateProject: (name: string) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function ProjectsList({
  projects,
  loading,
  storageMode,
  onOpenProject,
  onCreateProject,
  onDeleteProject,
  onRefresh,
}: ProjectsListProps) {
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    setIsCreating(true);
    try {
      await onCreateProject(newProjectName.trim());
      setNewProjectName("");
      setShowCreateForm(false);
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`Delete project "${name}"? This cannot be undone.`)) return;
    
    setDeletingId(id);
    try {
      await onDeleteProject(id);
    } catch (error) {
      console.error("Failed to delete project:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-canvas-800 flex items-center gap-2 sm:gap-3">
            <span className="text-3xl sm:text-4xl">&#128194;</span>
            Projects
          </h1>
          <p className="text-canvas-600 mt-1 flex flex-wrap items-center gap-2 text-sm sm:text-base">
            Manage your prompt projects — all data saves to{" "}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                storageMode === "azure" 
                  ? "bg-blue-100 text-blue-700" 
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {storageMode === "azure" ? "Azure Cloud" : "Local Only"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="btn btn-secondary text-sm sm:text-base"
          >
            {loading ? "..." : "Refresh"}
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary text-sm sm:text-base"
          >
            + New Project
          </button>
        </div>
      </div>

      {/* Create Project Form */}
      {showCreateForm && (
        <div className="card p-4 sm:p-5 mb-6 border-2 border-paw-200">
          <h3 className="font-semibold text-canvas-800 mb-3">Create New Project</h3>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              className="input flex-1"
              placeholder="Project name..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateProject();
                if (e.key === "Escape") setShowCreateForm(false);
              }}
              autoFocus
            />
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={handleCreateProject}
                disabled={isCreating || !newProjectName.trim()}
                className="btn btn-primary flex-1 sm:flex-none"
              >
                {isCreating ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewProjectName("");
                }}
                className="btn btn-secondary flex-1 sm:flex-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {loading && projects.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="animate-pulse text-4xl mb-4">&#9203;</div>
          <p className="text-canvas-600">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">&#128193;</div>
          <h3 className="text-xl font-semibold text-canvas-800 mb-2">No projects yet</h3>
          <p className="text-canvas-600 mb-4">
            Create your first project to start building prompts.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
          >
            + Create First Project
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="card p-4 sm:p-5 hover:shadow-lg transition-shadow cursor-pointer group relative"
              onClick={() => onOpenProject(project.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-canvas-800 truncate group-hover:text-paw-600 transition-colors">
                    {project.name}
                  </h3>
                  <div className="text-sm text-canvas-500 mt-1 space-y-0.5">
                    <p>{project.promptCount} {project.promptCount === 1 ? "prompt" : "prompts"}</p>
                    <p className="text-xs">
                      {project.characterCount || 0} characters, {project.wardrobeCount || 0} wardrobes
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project.id, project.name);
                  }}
                  disabled={deletingId === project.id}
                  className="p-2 text-canvas-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                  title="Delete project"
                >
                  {deletingId === project.id ? (
                    <span className="animate-spin">&#9203;</span>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-canvas-100 text-xs text-canvas-500">
                <div className="flex justify-between">
                  <span>Created: {formatDate(project.createdAt)}</span>
                </div>
                <div className="mt-1">
                  <span>Updated: {formatDate(project.updatedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

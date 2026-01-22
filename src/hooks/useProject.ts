"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Project,
  ProjectPrompt,
  ProjectListItem,
  createNewProject,
  createNewPrompt,
  addHistoryEntry,
  PromptHistoryEntry,
} from "@/lib/azure-storage";
import { PromptRequest } from "@/lib/schemas";

// ============================================
// LOCAL STORAGE KEYS
// ============================================

const LOCAL_STORAGE_KEYS = {
  projects: "pawsville_projects",
  currentProjectId: "pawsville_current_project_id",
  currentPromptId: "pawsville_current_prompt_id",
} as const;

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

function getLocalProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.projects);
    if (!raw) {
      console.log("[localStorage] No projects found in localStorage");
      return [];
    }
    const projects = JSON.parse(raw);
    console.log("[localStorage] Loaded", projects.length, "projects from localStorage");
    return projects;
  } catch (e) {
    console.error("[localStorage] Error parsing projects:", e);
    return [];
  }
}

function setLocalProjects(projects: Project[]): void {
  if (typeof window === "undefined") return;
  try {
    const json = JSON.stringify(projects);
    localStorage.setItem(LOCAL_STORAGE_KEYS.projects, json);
    console.log("[localStorage] Saved", projects.length, "projects to localStorage (", json.length, "bytes)");
  } catch (e) {
    console.error("[localStorage] Error saving projects:", e);
    throw e;
  }
}

function getLocalProject(id: string): Project | null {
  const projects = getLocalProjects();
  const project = projects.find((p) => p.id === id) || null;
  console.log("[localStorage] getLocalProject", id, "found:", !!project);
  return project;
}

function saveLocalProject(project: Project): void {
  console.log("[localStorage] saveLocalProject called for:", project.id, project.name);
  const projects = getLocalProjects();
  const index = projects.findIndex((p) => p.id === project.id);
  if (index >= 0) {
    projects[index] = project;
    console.log("[localStorage] Updated existing project at index", index);
  } else {
    projects.push(project);
    console.log("[localStorage] Added new project, total count:", projects.length);
  }
  setLocalProjects(projects);
}

function deleteLocalProject(id: string): void {
  console.log("[localStorage] deleteLocalProject called for:", id);
  const projects = getLocalProjects();
  const filtered = projects.filter((p) => p.id !== id);
  console.log("[localStorage] Deleted project, count changed from", projects.length, "to", filtered.length);
  setLocalProjects(filtered);
}

function getCurrentProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LOCAL_STORAGE_KEYS.currentProjectId);
}

function setCurrentProjectId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.currentProjectId, id);
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.currentProjectId);
  }
}

function getCurrentPromptId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LOCAL_STORAGE_KEYS.currentPromptId);
}

function setCurrentPromptId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.currentPromptId, id);
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.currentPromptId);
  }
}

// ============================================
// API HELPERS
// ============================================

async function fetchProjects(): Promise<{ projects: ProjectListItem[]; storageMode: "azure" | "local"; error?: string }> {
  try {
    const response = await fetch("/api/projects");
    const data = await response.json();
    
    console.log("[useProject] fetchProjects API response:", { ok: data.ok, storageMode: data.data?.storageMode });
    
    if (data.ok) {
      if (data.data.storageMode === "local") {
        // Fallback to localStorage
        const localProjects = getLocalProjects();
        console.log("[useProject] Using local storage, found", localProjects.length, "projects");
        return {
          projects: localProjects.map((p) => ({
            id: p.id,
            name: p.name,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            promptCount: p.prompts.length,
          })),
          storageMode: "local",
        };
      }
      console.log("[useProject] Using Azure storage, found", data.data.projects?.length || 0, "projects");
      return data.data;
    }
    throw new Error(data.error?.message || "Failed to fetch projects");
  } catch (error) {
    console.error("[useProject] Error fetching projects, falling back to local:", error);
    const localProjects = getLocalProjects();
    return {
      projects: localProjects.map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        promptCount: p.prompts.length,
      })),
      storageMode: "local",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function fetchProject(id: string): Promise<{ project: Project | null; storageMode: "azure" | "local" }> {
  try {
    const response = await fetch(`/api/projects/${id}`);
    const data = await response.json();
    
    console.log("[useProject] fetchProject API response for", id, ":", { ok: data.ok, storageMode: data.data?.storageMode });
    
    if (data.ok) {
      if (data.data.storageMode === "local") {
        const localProject = getLocalProject(id);
        console.log("[useProject] Using local storage for project", id, "found:", !!localProject);
        return {
          project: localProject,
          storageMode: "local",
        };
      }
      console.log("[useProject] Using Azure storage for project", id);
      return data.data;
    }
    if (response.status === 404) {
      console.log("[useProject] Project not found in Azure, checking local");
      return { project: getLocalProject(id), storageMode: "local" };
    }
    throw new Error(data.error?.message || "Failed to fetch project");
  } catch (error) {
    console.error("[useProject] Error fetching project, falling back to local:", error);
    return {
      project: getLocalProject(id),
      storageMode: "local",
    };
  }
}

async function apiSaveProject(project: Project, storageMode: "azure" | "local"): Promise<{ success: boolean; error?: string }> {
  console.log("[useProject] apiSaveProject called for", project.id, "mode:", storageMode);
  
  // Always save to localStorage as backup
  try {
    saveLocalProject(project);
    console.log("[useProject] Saved to localStorage successfully");
  } catch (e) {
    console.error("[useProject] Failed to save to localStorage:", e);
    return { success: false, error: "Failed to save to local storage" };
  }
  
  if (storageMode === "local") {
    return { success: true };
  }

  try {
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
    });
    const data = await response.json();
    if (!data.ok) {
      console.error("[useProject] Error saving to Azure, local backup saved:", data.error);
      return { success: false, error: data.error?.message || "Azure save failed" };
    }
    console.log("[useProject] Saved to Azure successfully");
    return { success: true };
  } catch (error) {
    console.error("[useProject] Error saving project to Azure, local backup saved:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function apiCreateProject(name: string): Promise<{ project: Project; storageMode: "azure" | "local" }> {
  console.log("[useProject] apiCreateProject called with name:", name);
  
  try {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    
    console.log("[useProject] Create project API response:", { ok: data.ok, storageMode: data.data?.storageMode });
    
    if (data.ok) {
      const project = data.data.project;
      // Always save locally as backup
      try {
        saveLocalProject(project);
        console.log("[useProject] Project saved to localStorage as backup:", project.id);
      } catch (e) {
        console.error("[useProject] Failed to save project to localStorage:", e);
      }
      return data.data;
    }
    throw new Error(data.error?.message || "Failed to create project");
  } catch (error) {
    console.error("[useProject] Error creating project via API, creating locally:", error);
    const project = createNewProject(name);
    try {
      saveLocalProject(project);
      console.log("[useProject] Project created and saved locally:", project.id);
    } catch (e) {
      console.error("[useProject] Failed to save project to localStorage:", e);
    }
    return { project, storageMode: "local" };
  }
}

async function apiDeleteProject(id: string, storageMode: "azure" | "local"): Promise<void> {
  // Always delete from localStorage
  deleteLocalProject(id);
  
  if (storageMode === "local") {
    return;
  }

  try {
    const response = await fetch(`/api/projects/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!data.ok) {
      console.error("Error deleting from Azure:", data.error);
    }
  } catch (error) {
    console.error("Error deleting project from Azure:", error);
  }
}

// ============================================
// USE PROJECT HOOK
// ============================================

export interface UseProjectReturn {
  // Project list
  projects: ProjectListItem[];
  projectsLoading: boolean;
  refreshProjects: () => Promise<void>;
  
  // Current project
  currentProject: Project | null;
  projectLoading: boolean;
  openProject: (id: string) => Promise<void>;
  closeProject: () => Promise<void>;
  createProject: (name: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  renameProject: (name: string) => void;
  
  // Current prompt
  currentPrompt: ProjectPrompt | null;
  openPrompt: (id: string) => void;
  closePrompt: () => void;
  createPrompt: (title: string) => ProjectPrompt;
  deletePrompt: (id: string) => void;
  renamePrompt: (id: string, title: string) => void;
  duplicatePrompt: (id: string) => ProjectPrompt | null;
  
  // Prompt data
  updatePromptRequest: (updates: Partial<PromptRequest>) => void;
  saveHistoryEntry: (note?: string) => PromptHistoryEntry | null;
  restoreFromHistory: (historyId: string) => void;
  
  // Storage info
  storageMode: "azure" | "local";
  isSaving: boolean;
  lastSaved: Date | null;
  saveNow: () => Promise<boolean>;
}

export function useProject(): UseProjectReturn {
  // State
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [currentPromptId, setCurrentPromptIdState] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<"azure" | "local">("local");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Refs for auto-save - using refs to avoid stale closures
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<boolean>(false);
  const currentProjectRef = useRef<Project | null>(null);
  const storageModeRef = useRef<"azure" | "local">("local");
  const isSavingRef = useRef<boolean>(false);

  // Keep refs in sync with state
  useEffect(() => {
    currentProjectRef.current = currentProject;
  }, [currentProject]);

  useEffect(() => {
    storageModeRef.current = storageMode;
  }, [storageMode]);

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  // Get current prompt
  const currentPrompt = currentProject?.prompts.find((p) => p.id === currentPromptId) || null;

  // ============================================
  // LOAD INITIAL DATA
  // ============================================

  useEffect(() => {
    const loadInitialData = async () => {
      setProjectsLoading(true);
      
      // Load projects
      const { projects: loadedProjects, storageMode: mode } = await fetchProjects();
      setProjects(loadedProjects);
      setStorageMode(mode);
      
      // Check for previously open project
      const savedProjectId = getCurrentProjectId();
      if (savedProjectId) {
        const { project, storageMode: projectMode } = await fetchProject(savedProjectId);
        if (project) {
          setCurrentProject(project);
          setStorageMode(projectMode);
          
          // Check for previously open prompt
          const savedPromptId = getCurrentPromptId();
          if (savedPromptId && project.prompts.some((p) => p.id === savedPromptId)) {
            setCurrentPromptIdState(savedPromptId);
          }
        }
      }
      
      setProjectsLoading(false);
    };

    loadInitialData();
  }, []);

  // ============================================
  // AUTO-SAVE (every 30 seconds)
  // ============================================

  const saveNow = useCallback(async (): Promise<boolean> => {
    // Use refs to get the latest values and avoid stale closure issues
    const projectToSave = currentProjectRef.current;
    const mode = storageModeRef.current;
    
    console.log("[useProject] saveNow called, project:", projectToSave?.id, "mode:", mode);
    
    if (!projectToSave) {
      console.log("[useProject] saveNow: No project to save");
      return false;
    }
    
    if (isSavingRef.current) {
      console.log("[useProject] saveNow: Already saving, skipping");
      return false;
    }
    
    setIsSaving(true);
    isSavingRef.current = true;
    pendingSaveRef.current = false;
    
    try {
      const result = await apiSaveProject(projectToSave, mode);
      if (result.success) {
        setLastSaved(new Date());
        console.log("[useProject] saveNow completed successfully");
      } else {
        console.error("[useProject] saveNow failed:", result.error);
      }
      return result.success;
    } catch (error) {
      console.error("[useProject] Error saving project:", error);
      return false;
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, []); // No dependencies needed - we use refs

  // Schedule auto-save - debounced to 3 seconds for better UX
  const scheduleAutoSave = useCallback(() => {
    pendingSaveRef.current = true;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (pendingSaveRef.current) {
        saveNow();
      }
    }, 3000); // 3 seconds - reduced from 30s for better responsiveness
  }, [saveNow]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentProject && pendingSaveRef.current) {
        // Sync save to localStorage at minimum
        saveLocalProject(currentProject);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentProject]);

  // ============================================
  // PROJECT OPERATIONS
  // ============================================

  const refreshProjects = useCallback(async () => {
    setProjectsLoading(true);
    const { projects: loadedProjects, storageMode: mode } = await fetchProjects();
    setProjects(loadedProjects);
    setStorageMode(mode);
    setProjectsLoading(false);
  }, []);

  const openProject = useCallback(async (id: string) => {
    setProjectLoading(true);
    
    const { project, storageMode: mode } = await fetchProject(id);
    
    if (project) {
      setCurrentProject(project);
      setStorageMode(mode);
      setCurrentProjectId(id);
      setCurrentPromptIdState(null);
      setCurrentPromptId(null);
    }
    
    setProjectLoading(false);
  }, []);

  const closeProject = useCallback(async () => {
    console.log("[useProject] closeProject called");
    
    // Save before closing if there are pending changes
    if (currentProjectRef.current && pendingSaveRef.current) {
      console.log("[useProject] Saving pending changes before closing");
      await saveNow();
    }
    
    setCurrentProject(null);
    currentProjectRef.current = null;
    setCurrentPromptIdState(null);
    setCurrentProjectId(null);
    setCurrentPromptId(null);
    
    // Refresh the projects list to show updated data
    await refreshProjects();
    
    console.log("[useProject] closeProject completed");
  }, [saveNow, refreshProjects]);

  const createProject = useCallback(async (name: string): Promise<Project> => {
    console.log("[useProject] createProject callback starting for:", name);
    const { project, storageMode: mode } = await apiCreateProject(name);
    setStorageMode(mode);
    storageModeRef.current = mode;
    
    // Open the new project
    setCurrentProject(project);
    currentProjectRef.current = project;
    setCurrentProjectId(project.id);
    
    // Ensure the project is saved immediately (don't rely on auto-save)
    console.log("[useProject] Triggering immediate save for new project");
    await apiSaveProject(project, mode);
    
    // Refresh project list
    await refreshProjects();
    
    console.log("[useProject] createProject completed for:", project.id);
    return project;
  }, [refreshProjects]);

  const deleteProject = useCallback(async (id: string) => {
    await apiDeleteProject(id, storageMode);
    
    // If deleting current project, close it
    if (currentProject?.id === id) {
      setCurrentProject(null);
      setCurrentPromptIdState(null);
      setCurrentProjectId(null);
      setCurrentPromptId(null);
    }
    
    // Refresh project list
    await refreshProjects();
  }, [currentProject, storageMode, refreshProjects]);

  const renameProject = useCallback((name: string) => {
    if (!currentProject) return;
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        name,
        updatedAt: new Date().toISOString(),
      };
    });
    
    scheduleAutoSave();
  }, [currentProject, scheduleAutoSave]);

  // ============================================
  // PROMPT OPERATIONS
  // ============================================

  const openPrompt = useCallback((id: string) => {
    if (!currentProject?.prompts.some((p) => p.id === id)) return;
    setCurrentPromptIdState(id);
    setCurrentPromptId(id);
  }, [currentProject]);

  const closePrompt = useCallback(() => {
    setCurrentPromptIdState(null);
    setCurrentPromptId(null);
  }, []);

  const createPrompt = useCallback((title: string): ProjectPrompt => {
    const newPrompt = createNewPrompt(title);
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        prompts: [...prev.prompts, newPrompt],
        updatedAt: new Date().toISOString(),
      };
    });
    
    // Open the new prompt
    setCurrentPromptIdState(newPrompt.id);
    setCurrentPromptId(newPrompt.id);
    
    scheduleAutoSave();
    
    return newPrompt;
  }, [scheduleAutoSave]);

  const deletePrompt = useCallback((id: string) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        prompts: prev.prompts.filter((p) => p.id !== id),
        updatedAt: new Date().toISOString(),
      };
    });
    
    // If deleting current prompt, close it
    if (currentPromptId === id) {
      setCurrentPromptIdState(null);
      setCurrentPromptId(null);
    }
    
    scheduleAutoSave();
  }, [currentPromptId, scheduleAutoSave]);

  const renamePrompt = useCallback((id: string, title: string) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        prompts: prev.prompts.map((p) =>
          p.id === id
            ? { ...p, title, updatedAt: new Date().toISOString() }
            : p
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const duplicatePrompt = useCallback((id: string): ProjectPrompt | null => {
    if (!currentProject) return null;
    
    const original = currentProject.prompts.find((p) => p.id === id);
    if (!original) return null;
    
    const duplicate = createNewPrompt(`${original.title} (Copy)`);
    duplicate.promptRequest = { ...original.promptRequest };
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        prompts: [...prev.prompts, duplicate],
        updatedAt: new Date().toISOString(),
      };
    });
    
    scheduleAutoSave();
    
    return duplicate;
  }, [currentProject, scheduleAutoSave]);

  // ============================================
  // PROMPT DATA OPERATIONS
  // ============================================

  const updatePromptRequest = useCallback((updates: Partial<PromptRequest>) => {
    if (!currentPromptId) return;
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        prompts: prev.prompts.map((p) =>
          p.id === currentPromptId
            ? {
                ...p,
                promptRequest: { ...p.promptRequest, ...updates },
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    
    scheduleAutoSave();
  }, [currentPromptId, scheduleAutoSave]);

  const saveHistoryEntry = useCallback((note?: string): PromptHistoryEntry | null => {
    const project = currentProjectRef.current;
    if (!project || !currentPromptId) return null;
    
    const prompt = project.prompts.find((p) => p.id === currentPromptId);
    if (!prompt) return null;
    
    let entry: PromptHistoryEntry | null = null;
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        prompts: prev.prompts.map((p) => {
          if (p.id === currentPromptId) {
            entry = addHistoryEntry(p, note);
            return { ...p };
          }
          return p;
        }),
        updatedAt: new Date().toISOString(),
      };
      // Update ref immediately for the save
      currentProjectRef.current = updated;
      return updated;
    });
    
    // Trigger immediate save for history
    saveNow();
    
    return entry;
  }, [currentPromptId, saveNow]);

  const restoreFromHistory = useCallback((historyId: string) => {
    const project = currentProjectRef.current;
    if (!project || !currentPromptId) return;
    
    const prompt = project.prompts.find((p) => p.id === currentPromptId);
    if (!prompt) return;
    
    const historyEntry = prompt.history.find((h) => h.id === historyId);
    if (!historyEntry) return;
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        prompts: prev.prompts.map((p) =>
          p.id === currentPromptId
            ? {
                ...p,
                promptRequest: { ...historyEntry.promptRequest },
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    
    scheduleAutoSave();
  }, [currentPromptId, scheduleAutoSave]);

  return {
    // Project list
    projects,
    projectsLoading,
    refreshProjects,
    
    // Current project
    currentProject,
    projectLoading,
    openProject,
    closeProject,
    createProject,
    deleteProject,
    renameProject,
    
    // Current prompt
    currentPrompt,
    openPrompt,
    closePrompt,
    createPrompt,
    deletePrompt,
    renamePrompt,
    duplicatePrompt,
    
    // Prompt data
    updatePromptRequest,
    saveHistoryEntry,
    restoreFromHistory,
    
    // Storage info
    storageMode,
    isSaving,
    lastSaved,
    saveNow,
  };
}

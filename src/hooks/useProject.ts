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
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setLocalProjects(projects: Project[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEYS.projects, JSON.stringify(projects));
}

function getLocalProject(id: string): Project | null {
  const projects = getLocalProjects();
  return projects.find((p) => p.id === id) || null;
}

function saveLocalProject(project: Project): void {
  const projects = getLocalProjects();
  const index = projects.findIndex((p) => p.id === project.id);
  if (index >= 0) {
    projects[index] = project;
  } else {
    projects.push(project);
  }
  setLocalProjects(projects);
}

function deleteLocalProject(id: string): void {
  const projects = getLocalProjects();
  setLocalProjects(projects.filter((p) => p.id !== id));
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

async function fetchProjects(): Promise<{ projects: ProjectListItem[]; storageMode: "azure" | "local" }> {
  try {
    const response = await fetch("/api/projects");
    const data = await response.json();
    
    if (data.ok) {
      if (data.data.storageMode === "local") {
        // Fallback to localStorage
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
        };
      }
      return data.data;
    }
    throw new Error(data.error?.message || "Failed to fetch projects");
  } catch (error) {
    console.error("Error fetching projects, falling back to local:", error);
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
    };
  }
}

async function fetchProject(id: string): Promise<{ project: Project | null; storageMode: "azure" | "local" }> {
  try {
    const response = await fetch(`/api/projects/${id}`);
    const data = await response.json();
    
    if (data.ok) {
      if (data.data.storageMode === "local") {
        return {
          project: getLocalProject(id),
          storageMode: "local",
        };
      }
      return data.data;
    }
    if (response.status === 404) {
      return { project: getLocalProject(id), storageMode: "local" };
    }
    throw new Error(data.error?.message || "Failed to fetch project");
  } catch (error) {
    console.error("Error fetching project, falling back to local:", error);
    return {
      project: getLocalProject(id),
      storageMode: "local",
    };
  }
}

async function apiSaveProject(project: Project, storageMode: "azure" | "local"): Promise<void> {
  // Always save to localStorage as backup
  saveLocalProject(project);
  
  if (storageMode === "local") {
    return;
  }

  try {
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
    });
    const data = await response.json();
    if (!data.ok) {
      console.error("Error saving to Azure, local backup saved:", data.error);
    }
  } catch (error) {
    console.error("Error saving project to Azure, local backup saved:", error);
  }
}

async function apiCreateProject(name: string): Promise<{ project: Project; storageMode: "azure" | "local" }> {
  try {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    
    if (data.ok) {
      const project = data.data.project;
      // Always save locally as backup
      saveLocalProject(project);
      return data.data;
    }
    throw new Error(data.error?.message || "Failed to create project");
  } catch (error) {
    console.error("Error creating project via API, creating locally:", error);
    const project = createNewProject(name);
    saveLocalProject(project);
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
  closeProject: () => void;
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
  saveNow: () => Promise<void>;
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
  
  // Refs for auto-save
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<boolean>(false);

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

  const saveNow = useCallback(async () => {
    if (!currentProject || isSaving) return;
    
    setIsSaving(true);
    pendingSaveRef.current = false;
    
    await apiSaveProject(currentProject, storageMode);
    
    setIsSaving(false);
    setLastSaved(new Date());
  }, [currentProject, storageMode, isSaving]);

  // Schedule auto-save
  const scheduleAutoSave = useCallback(() => {
    pendingSaveRef.current = true;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (pendingSaveRef.current) {
        saveNow();
      }
    }, 30000); // 30 seconds
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

  const closeProject = useCallback(() => {
    // Save before closing
    if (currentProject && pendingSaveRef.current) {
      saveNow();
    }
    
    setCurrentProject(null);
    setCurrentPromptIdState(null);
    setCurrentProjectId(null);
    setCurrentPromptId(null);
  }, [currentProject, saveNow]);

  const createProject = useCallback(async (name: string): Promise<Project> => {
    const { project, storageMode: mode } = await apiCreateProject(name);
    setStorageMode(mode);
    
    // Refresh project list
    await refreshProjects();
    
    // Open the new project
    setCurrentProject(project);
    setCurrentProjectId(project.id);
    
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
    if (!currentProject || !currentPromptId) return null;
    
    const prompt = currentProject.prompts.find((p) => p.id === currentPromptId);
    if (!prompt) return null;
    
    let entry: PromptHistoryEntry | null = null;
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      return {
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
    });
    
    // Trigger immediate save for history
    saveNow();
    
    return entry;
  }, [currentProject, currentPromptId, saveNow]);

  const restoreFromHistory = useCallback((historyId: string) => {
    if (!currentProject || !currentPromptId) return;
    
    const prompt = currentProject.prompts.find((p) => p.id === currentPromptId);
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
  }, [currentProject, currentPromptId, scheduleAutoSave]);

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

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
import {
  PromptRequest,
  CharacterProfile,
  WardrobeProfile,
  LensProfile,
  LookFamily,
  MicroTexturePack,
  MicroDetailPack,
  EnvironmentPreset,
} from "@/lib/schemas";

// ============================================
// SESSION STORAGE KEYS (just for current session, not data)
// ============================================

const SESSION_KEYS = {
  currentProjectId: "pawsville_current_project_id",
  currentPromptId: "pawsville_current_prompt_id",
} as const;

function getCurrentProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_KEYS.currentProjectId);
}

function setCurrentProjectId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) {
    sessionStorage.setItem(SESSION_KEYS.currentProjectId, id);
  } else {
    sessionStorage.removeItem(SESSION_KEYS.currentProjectId);
  }
}

function getCurrentPromptId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_KEYS.currentPromptId);
}

function setCurrentPromptId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) {
    sessionStorage.setItem(SESSION_KEYS.currentPromptId, id);
  } else {
    sessionStorage.removeItem(SESSION_KEYS.currentPromptId);
  }
}

// ============================================
// API HELPERS - ALL DATA GOES TO AZURE
// ============================================

async function fetchProjects(): Promise<{ projects: ProjectListItem[]; storageMode: "azure" | "local"; error?: string }> {
  try {
    const response = await fetch("/api/projects");
    const data = await response.json();
    
    console.log("[useProject] fetchProjects API response:", { ok: data.ok, storageMode: data.data?.storageMode });
    
    if (data.ok) {
      return {
        projects: data.data.projects || [],
        storageMode: data.data.storageMode,
      };
    }
    throw new Error(data.error?.message || "Failed to fetch projects");
  } catch (error) {
    console.error("[useProject] Error fetching projects:", error);
    return {
      projects: [],
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
    
    if (data.ok && data.data.project) {
      return {
        project: data.data.project,
        storageMode: data.data.storageMode,
      };
    }
    if (response.status === 404) {
      console.log("[useProject] Project not found:", id);
      return { project: null, storageMode: "local" };
    }
    throw new Error(data.error?.message || "Failed to fetch project");
  } catch (error) {
    console.error("[useProject] Error fetching project:", error);
    return {
      project: null,
      storageMode: "local",
    };
  }
}

async function apiSaveProject(project: Project): Promise<{ success: boolean; error?: string }> {
  console.log("[useProject] apiSaveProject called for", project.id, "with", project.characters.length, "characters,", project.wardrobes.length, "wardrobes");
  
  try {
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
    });
    const data = await response.json();
    if (!data.ok) {
      console.error("[useProject] Error saving to Azure:", data.error);
      return { success: false, error: data.error?.message || "Save failed" };
    }
    console.log("[useProject] Saved to Azure successfully");
    return { success: true };
  } catch (error) {
    console.error("[useProject] Error saving project to Azure:", error);
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
      return data.data;
    }
    throw new Error(data.error?.message || "Failed to create project");
  } catch (error) {
    console.error("[useProject] Error creating project via API:", error);
    // Create locally if API fails
    const project = createNewProject(name);
    return { project, storageMode: "local" };
  }
}

async function apiDeleteProject(id: string): Promise<void> {
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
// HELPER: Generate ID
// ============================================

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
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
  
  // CHARACTER CRUD - saved to project/Azure
  characters: CharacterProfile[];
  addCharacter: (data: Omit<CharacterProfile, "id" | "createdAt" | "updatedAt">) => CharacterProfile;
  updateCharacter: (id: string, updates: Partial<CharacterProfile>) => void;
  deleteCharacter: (id: string) => void;
  duplicateCharacter: (id: string) => CharacterProfile | null;
  
  // WARDROBE CRUD - saved to project/Azure
  wardrobes: WardrobeProfile[];
  addWardrobe: (data: Omit<WardrobeProfile, "id" | "createdAt" | "updatedAt">) => WardrobeProfile;
  updateWardrobe: (id: string, updates: Partial<WardrobeProfile>) => void;
  deleteWardrobe: (id: string) => void;
  duplicateWardrobe: (id: string) => WardrobeProfile | null;

  // ENVIRONMENT LOCK CRUD - saved to project/Azure
  environmentPresets: EnvironmentPreset[];
  activeEnvironmentPresetId: string | null;
  addEnvironmentPreset: (data: Omit<EnvironmentPreset, "id" | "createdAt" | "updatedAt">) => EnvironmentPreset;
  updateEnvironmentPreset: (id: string, updates: Partial<EnvironmentPreset>) => void;
  deleteEnvironmentPreset: (id: string) => void;
  duplicateEnvironmentPreset: (id: string) => EnvironmentPreset | null;
  setActiveEnvironmentPreset: (id: string | null) => void;
  
  // LENS CRUD - saved to project/Azure
  lenses: LensProfile[];
  addLens: (data: Omit<LensProfile, "id" | "createdAt" | "updatedAt">) => LensProfile;
  updateLens: (id: string, updates: Partial<LensProfile>) => void;
  deleteLens: (id: string) => void;
  duplicateLens: (id: string) => LensProfile | null;
  
  // LOOK CRUD - saved to project/Azure
  looks: LookFamily[];
  addLook: (data: Omit<LookFamily, "id" | "createdAt" | "updatedAt">) => LookFamily;
  updateLook: (id: string, updates: Partial<LookFamily>) => void;
  deleteLook: (id: string) => void;
  duplicateLook: (id: string) => LookFamily | null;
  
  // MICRO TEXTURE CRUD - saved to project/Azure
  microTextures: MicroTexturePack[];
  addMicroTexture: (data: Omit<MicroTexturePack, "id" | "createdAt" | "updatedAt">) => MicroTexturePack;
  updateMicroTexture: (id: string, updates: Partial<MicroTexturePack>) => void;
  deleteMicroTexture: (id: string) => void;
  duplicateMicroTexture: (id: string) => MicroTexturePack | null;
  
  // MICRO DETAIL CRUD - saved to project/Azure
  microDetails: MicroDetailPack[];
  addMicroDetail: (data: Omit<MicroDetailPack, "id" | "createdAt" | "updatedAt">) => MicroDetailPack;
  updateMicroDetail: (id: string, updates: Partial<MicroDetailPack>) => void;
  deleteMicroDetail: (id: string) => void;
  duplicateMicroDetail: (id: string) => MicroDetailPack | null;
  
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
  const [storageMode, setStorageMode] = useState<"azure" | "local">("azure");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Refs for auto-save
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<boolean>(false);
  const currentProjectRef = useRef<Project | null>(null);
  const isSavingRef = useRef<boolean>(false);

  // Keep refs in sync with state
  useEffect(() => {
    currentProjectRef.current = currentProject;
  }, [currentProject]);

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  // Get current prompt
  const currentPrompt = currentProject?.prompts.find((p) => p.id === currentPromptId) || null;
  
  // Get data arrays from current project
  const characters = currentProject?.characters || [];
  const wardrobes = currentProject?.wardrobes || [];
  const environmentPresets = currentProject?.environmentPresets || [];
  const activeEnvironmentPresetId = currentProject?.activeEnvironmentPresetId || null;
  const lenses = currentProject?.lenses || [];
  const looks = currentProject?.looks || [];
  const microTextures = currentProject?.microTextures || [];
  const microDetails = currentProject?.microDetails || [];

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
  // AUTO-SAVE
  // ============================================

  const saveNow = useCallback(async (): Promise<boolean> => {
    const projectToSave = currentProjectRef.current;
    
    console.log("[useProject] saveNow called, project:", projectToSave?.id);
    
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
      const result = await apiSaveProject(projectToSave);
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
  }, []);

  // Schedule auto-save - debounced to 2 seconds
  const scheduleAutoSave = useCallback(() => {
    pendingSaveRef.current = true;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (pendingSaveRef.current) {
        saveNow();
      }
    }, 2000);
  }, [saveNow]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

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
      currentProjectRef.current = project;
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
    
    // Refresh the projects list
    await refreshProjects();
    
    console.log("[useProject] closeProject completed");
  }, [saveNow, refreshProjects]);

  const createProject = useCallback(async (name: string): Promise<Project> => {
    console.log("[useProject] createProject callback starting for:", name);
    const { project, storageMode: mode } = await apiCreateProject(name);
    setStorageMode(mode);
    
    // Open the new project
    setCurrentProject(project);
    currentProjectRef.current = project;
    setCurrentProjectId(project.id);
    
    // Save immediately
    console.log("[useProject] Triggering immediate save for new project");
    await apiSaveProject(project);
    
    // Refresh project list
    await refreshProjects();
    
    console.log("[useProject] createProject completed for:", project.id);
    return project;
  }, [refreshProjects]);

  const deleteProject = useCallback(async (id: string) => {
    await apiDeleteProject(id);
    
    // If deleting current project, close it
    if (currentProject?.id === id) {
      setCurrentProject(null);
      currentProjectRef.current = null;
      setCurrentPromptIdState(null);
      setCurrentProjectId(null);
      setCurrentPromptId(null);
    }
    
    // Refresh project list
    await refreshProjects();
  }, [currentProject, refreshProjects]);

  const renameProject = useCallback((name: string) => {
    if (!currentProject) return;
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        name,
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
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
      const updated = {
        ...prev,
        prompts: [...prev.prompts, newPrompt],
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
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
      const updated = {
        ...prev,
        prompts: prev.prompts.filter((p) => p.id !== id),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
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
      const updated = {
        ...prev,
        prompts: prev.prompts.map((p) =>
          p.id === id ? { ...p, title, updatedAt: now() } : p
        ),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
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
      const updated = {
        ...prev,
        prompts: [...prev.prompts, duplicate],
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
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
      const updated = {
        ...prev,
        prompts: prev.prompts.map((p) =>
          p.id === currentPromptId
            ? {
                ...p,
                promptRequest: { ...p.promptRequest, ...updates },
                updatedAt: now(),
              }
            : p
        ),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
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
        updatedAt: now(),
      };
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
      const updated = {
        ...prev,
        prompts: prev.prompts.map((p) =>
          p.id === currentPromptId
            ? {
                ...p,
                promptRequest: { ...historyEntry.promptRequest },
                updatedAt: now(),
              }
            : p
        ),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
  }, [currentPromptId, scheduleAutoSave]);

  // ============================================
  // CHARACTER CRUD
  // ============================================

  const addCharacter = useCallback((data: Omit<CharacterProfile, "id" | "createdAt" | "updatedAt">): CharacterProfile => {
    const newChar: CharacterProfile = {
      ...data,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    };
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        characters: [...prev.characters, newChar],
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
    return newChar;
  }, [scheduleAutoSave]);

  const updateCharacter = useCallback((id: string, updates: Partial<CharacterProfile>) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        characters: prev.characters.map((c) =>
          c.id === id ? { ...c, ...updates, id, createdAt: c.createdAt, updatedAt: now() } : c
        ),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const deleteCharacter = useCallback((id: string) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        characters: prev.characters.filter((c) => c.id !== id),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const duplicateCharacter = useCallback((id: string): CharacterProfile | null => {
    const project = currentProjectRef.current;
    if (!project) return null;
    
    const original = project.characters.find((c) => c.id === id);
    if (!original) return null;
    
    const duplicate: CharacterProfile = {
      ...original,
      id: generateId(),
      uiName: `${original.uiName} (Copy)`,
      createdAt: now(),
      updatedAt: now(),
    };
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        characters: [...prev.characters, duplicate],
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
    return duplicate;
  }, [scheduleAutoSave]);

  // ============================================
  // WARDROBE CRUD
  // ============================================

  const addWardrobe = useCallback((data: Omit<WardrobeProfile, "id" | "createdAt" | "updatedAt">): WardrobeProfile => {
    const newWardrobe: WardrobeProfile = {
      ...data,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    };
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        wardrobes: [...prev.wardrobes, newWardrobe],
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
    return newWardrobe;
  }, [scheduleAutoSave]);

  const updateWardrobe = useCallback((id: string, updates: Partial<WardrobeProfile>) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        wardrobes: prev.wardrobes.map((w) =>
          w.id === id ? { ...w, ...updates, id, createdAt: w.createdAt, updatedAt: now() } : w
        ),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const deleteWardrobe = useCallback((id: string) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        wardrobes: prev.wardrobes.filter((w) => w.id !== id),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const duplicateWardrobe = useCallback((id: string): WardrobeProfile | null => {
    const project = currentProjectRef.current;
    if (!project) return null;
    
    const original = project.wardrobes.find((w) => w.id === id);
    if (!original) return null;
    
    const duplicate: WardrobeProfile = {
      ...original,
      id: generateId(),
      uiName: `${original.uiName} (Copy)`,
      createdAt: now(),
      updatedAt: now(),
    };
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        wardrobes: [...prev.wardrobes, duplicate],
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
    return duplicate;
  }, [scheduleAutoSave]);

  // ============================================
  // ENVIRONMENT LOCK CRUD
  // ============================================

  const addEnvironmentPreset = useCallback((data: Omit<EnvironmentPreset, "id" | "createdAt" | "updatedAt">): EnvironmentPreset => {
    const newPreset: EnvironmentPreset = {
      ...data,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    };

    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        environmentPresets: [...prev.environmentPresets, newPreset],
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });

    scheduleAutoSave();
    return newPreset;
  }, [scheduleAutoSave]);

  const updateEnvironmentPreset = useCallback((id: string, updates: Partial<EnvironmentPreset>) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        environmentPresets: prev.environmentPresets.map((preset) =>
          preset.id === id ? { ...preset, ...updates, id, createdAt: preset.createdAt, updatedAt: now() } : preset
        ),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });

    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const deleteEnvironmentPreset = useCallback((id: string) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        environmentPresets: prev.environmentPresets.filter((preset) => preset.id !== id),
        activeEnvironmentPresetId: prev.activeEnvironmentPresetId === id ? null : prev.activeEnvironmentPresetId,
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });

    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const duplicateEnvironmentPreset = useCallback((id: string): EnvironmentPreset | null => {
    const project = currentProjectRef.current;
    if (!project) return null;

    const original = project.environmentPresets.find((preset) => preset.id === id);
    if (!original) return null;

    const duplicate: EnvironmentPreset = {
      ...original,
      id: generateId(),
      uiName: `${original.uiName} (Copy)`,
      createdAt: now(),
      updatedAt: now(),
    };

    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        environmentPresets: [...prev.environmentPresets, duplicate],
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });

    scheduleAutoSave();
    return duplicate;
  }, [scheduleAutoSave]);

  const setActiveEnvironmentPreset = useCallback((id: string | null) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        activeEnvironmentPresetId: id,
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });

    scheduleAutoSave();
  }, [scheduleAutoSave]);

  // ============================================
  // LENS CRUD
  // ============================================

  const addLens = useCallback((data: Omit<LensProfile, "id" | "createdAt" | "updatedAt">): LensProfile => {
    const newLens: LensProfile = {
      ...data,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    };
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        lenses: [...prev.lenses, newLens],
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
    return newLens;
  }, [scheduleAutoSave]);

  const updateLens = useCallback((id: string, updates: Partial<LensProfile>) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        lenses: prev.lenses.map((l) =>
          l.id === id ? { ...l, ...updates, id, createdAt: l.createdAt, updatedAt: now() } : l
        ),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const deleteLens = useCallback((id: string) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        lenses: prev.lenses.filter((l) => l.id !== id),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const duplicateLens = useCallback((id: string): LensProfile | null => {
    const project = currentProjectRef.current;
    if (!project) return null;
    
    const original = project.lenses.find((l) => l.id === id);
    if (!original) return null;
    
    const duplicate: LensProfile = {
      ...original,
      id: generateId(),
      uiName: `${original.uiName} (Copy)`,
      createdAt: now(),
      updatedAt: now(),
    };
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        lenses: [...prev.lenses, duplicate],
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
    return duplicate;
  }, [scheduleAutoSave]);

  // ============================================
  // LOOK CRUD
  // ============================================

  const addLook = useCallback((data: Omit<LookFamily, "id" | "createdAt" | "updatedAt">): LookFamily => {
    const newLook: LookFamily = {
      ...data,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    };
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        looks: [...prev.looks, newLook],
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
    return newLook;
  }, [scheduleAutoSave]);

  const updateLook = useCallback((id: string, updates: Partial<LookFamily>) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        looks: prev.looks.map((l) =>
          l.id === id ? { ...l, ...updates, id, createdAt: l.createdAt, updatedAt: now() } : l
        ),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const deleteLook = useCallback((id: string) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        looks: prev.looks.filter((l) => l.id !== id),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const duplicateLook = useCallback((id: string): LookFamily | null => {
    const project = currentProjectRef.current;
    if (!project) return null;
    
    const original = project.looks.find((l) => l.id === id);
    if (!original) return null;
    
    const duplicate: LookFamily = {
      ...original,
      id: generateId(),
      uiName: `${original.uiName} (Copy)`,
      createdAt: now(),
      updatedAt: now(),
    };
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        looks: [...prev.looks, duplicate],
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
    return duplicate;
  }, [scheduleAutoSave]);

  // ============================================
  // MICRO TEXTURE CRUD
  // ============================================

  const addMicroTexture = useCallback((data: Omit<MicroTexturePack, "id" | "createdAt" | "updatedAt">): MicroTexturePack => {
    const newPack: MicroTexturePack = {
      ...data,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    };
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        microTextures: [...prev.microTextures, newPack],
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
    return newPack;
  }, [scheduleAutoSave]);

  const updateMicroTexture = useCallback((id: string, updates: Partial<MicroTexturePack>) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        microTextures: prev.microTextures.map((m) =>
          m.id === id ? { ...m, ...updates, id, createdAt: m.createdAt, updatedAt: now() } : m
        ),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const deleteMicroTexture = useCallback((id: string) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        microTextures: prev.microTextures.filter((m) => m.id !== id),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const duplicateMicroTexture = useCallback((id: string): MicroTexturePack | null => {
    const project = currentProjectRef.current;
    if (!project) return null;
    
    const original = project.microTextures.find((m) => m.id === id);
    if (!original) return null;
    
    const duplicate: MicroTexturePack = {
      ...original,
      id: generateId(),
      uiName: `${original.uiName} (Copy)`,
      createdAt: now(),
      updatedAt: now(),
    };
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        microTextures: [...prev.microTextures, duplicate],
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
    return duplicate;
  }, [scheduleAutoSave]);

  // ============================================
  // MICRO DETAIL CRUD
  // ============================================

  const addMicroDetail = useCallback((data: Omit<MicroDetailPack, "id" | "createdAt" | "updatedAt">): MicroDetailPack => {
    const newPack: MicroDetailPack = {
      ...data,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    };
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        microDetails: [...prev.microDetails, newPack],
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
    return newPack;
  }, [scheduleAutoSave]);

  const updateMicroDetail = useCallback((id: string, updates: Partial<MicroDetailPack>) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        microDetails: prev.microDetails.map((m) =>
          m.id === id ? { ...m, ...updates, id, createdAt: m.createdAt, updatedAt: now() } : m
        ),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const deleteMicroDetail = useCallback((id: string) => {
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        microDetails: prev.microDetails.filter((m) => m.id !== id),
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const duplicateMicroDetail = useCallback((id: string): MicroDetailPack | null => {
    const project = currentProjectRef.current;
    if (!project) return null;
    
    const original = project.microDetails.find((m) => m.id === id);
    if (!original) return null;
    
    const duplicate: MicroDetailPack = {
      ...original,
      id: generateId(),
      uiName: `${original.uiName} (Copy)`,
      createdAt: now(),
      updatedAt: now(),
    };
    
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        microDetails: [...prev.microDetails, duplicate],
        updatedAt: now(),
      };
      currentProjectRef.current = updated;
      return updated;
    });
    
    scheduleAutoSave();
    return duplicate;
  }, [scheduleAutoSave]);

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
    
    // Character CRUD
    characters,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    duplicateCharacter,
    
    // Wardrobe CRUD
    wardrobes,
    addWardrobe,
    updateWardrobe,
    deleteWardrobe,
    duplicateWardrobe,

    // Environment Lock CRUD
    environmentPresets,
    activeEnvironmentPresetId,
    addEnvironmentPreset,
    updateEnvironmentPreset,
    deleteEnvironmentPreset,
    duplicateEnvironmentPreset,
    setActiveEnvironmentPreset,
    
    // Lens CRUD
    lenses,
    addLens,
    updateLens,
    deleteLens,
    duplicateLens,
    
    // Look CRUD
    looks,
    addLook,
    updateLook,
    deleteLook,
    duplicateLook,
    
    // Micro texture CRUD
    microTextures,
    addMicroTexture,
    updateMicroTexture,
    deleteMicroTexture,
    duplicateMicroTexture,
    
    // Micro detail CRUD
    microDetails,
    addMicroDetail,
    updateMicroDetail,
    deleteMicroDetail,
    duplicateMicroDetail,
    
    // Storage info
    storageMode,
    isSaving,
    lastSaved,
    saveNow,
  };
}

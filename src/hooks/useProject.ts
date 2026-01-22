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
} from "@/lib/schemas";

// ============================================
// LOCAL STORAGE - BACKUP FOR PROJECT DATA
// This ensures data is NEVER lost, even if Azure has issues
// ============================================

const STORAGE_KEYS = {
  projects: "pawsville_projects_v2",
  currentProjectId: "pawsville_current_project_id",
  currentPromptId: "pawsville_current_prompt_id",
} as const;

function getLocalProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.projects);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("[localStorage] Error reading projects:", e);
    return [];
  }
}

function saveLocalProjects(projects: Project[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
  } catch (e) {
    console.error("[localStorage] Error saving projects:", e);
  }
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
  saveLocalProjects(projects);
}

function deleteLocalProject(id: string): void {
  const projects = getLocalProjects();
  saveLocalProjects(projects.filter((p) => p.id !== id));
}

function getCurrentProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.currentProjectId);
}

function setCurrentProjectId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(STORAGE_KEYS.currentProjectId, id);
  } else {
    localStorage.removeItem(STORAGE_KEYS.currentProjectId);
  }
}

function getCurrentPromptId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.currentPromptId);
}

function setCurrentPromptId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(STORAGE_KEYS.currentPromptId, id);
  } else {
    localStorage.removeItem(STORAGE_KEYS.currentPromptId);
  }
}

// ============================================
// API HELPERS - AZURE WITH LOCAL BACKUP
// ============================================

async function fetchProjects(): Promise<{ projects: ProjectListItem[]; storageMode: "azure" | "local"; error?: string }> {
  try {
    const response = await fetch("/api/projects");
    const data = await response.json();
    
    if (data.ok && data.data.storageMode === "azure" && data.data.projects?.length > 0) {
      // Azure has projects - use them
      return {
        projects: data.data.projects,
        storageMode: "azure",
      };
    }
    
    // Fall back to local storage
    const localProjects = getLocalProjects();
    return {
      projects: localProjects.map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        promptCount: p.prompts?.length || 0,
        characterCount: p.characters?.length || 0,
        wardrobeCount: p.wardrobes?.length || 0,
      })),
      storageMode: data.data?.storageMode || "local",
    };
  } catch (error) {
    console.error("[useProject] Error fetching projects:", error);
    // Fall back to local
    const localProjects = getLocalProjects();
    return {
      projects: localProjects.map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        promptCount: p.prompts?.length || 0,
        characterCount: p.characters?.length || 0,
        wardrobeCount: p.wardrobes?.length || 0,
      })),
      storageMode: "local",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function fetchProject(id: string): Promise<{ project: Project | null; storageMode: "azure" | "local" }> {
  // ALWAYS try local first for immediate response
  const localProject = getLocalProject(id);
  
  try {
    const response = await fetch(`/api/projects/${id}`);
    const data = await response.json();
    
    if (data.ok && data.data.project) {
      // Got from Azure - save to local as backup and return
      saveLocalProject(data.data.project);
      return {
        project: data.data.project,
        storageMode: "azure",
      };
    }
  } catch (error) {
    console.error("[useProject] Error fetching from Azure:", error);
  }
  
  // Fall back to local
  if (localProject) {
    return {
      project: localProject,
      storageMode: "local",
    };
  }
  
  return { project: null, storageMode: "local" };
}

async function apiSaveProject(project: Project): Promise<{ success: boolean; storageMode: "azure" | "local"; error?: string }> {
  // ALWAYS save to local first (instant backup)
  saveLocalProject(project);
  
  try {
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
    });
    const data = await response.json();
    
    if (data.ok && data.data.storageMode === "azure") {
      return { success: true, storageMode: "azure" };
    }
    
    // Azure not available but local save succeeded
    return { success: true, storageMode: "local" };
  } catch (error) {
    console.error("[useProject] Error saving to Azure:", error);
    // Local save already happened, so still success
    return { 
      success: true, 
      storageMode: "local",
      error: error instanceof Error ? error.message : "Azure save failed, saved locally"
    };
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
    
    if (data.ok && data.data.project) {
      // Save to local as backup
      saveLocalProject(data.data.project);
      return {
        project: data.data.project,
        storageMode: data.data.storageMode,
      };
    }
  } catch (error) {
    console.error("[useProject] Error creating via API:", error);
  }
  
  // Fall back to creating locally
  const project = createNewProject(name);
  saveLocalProject(project);
  return { project, storageMode: "local" };
}

async function apiDeleteProject(id: string): Promise<void> {
  // Delete from local
  deleteLocalProject(id);
  
  // Try to delete from Azure
  try {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
  } catch (error) {
    console.error("[useProject] Error deleting from Azure:", error);
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
  
  // CHARACTER CRUD
  characters: CharacterProfile[];
  addCharacter: (data: Omit<CharacterProfile, "id" | "createdAt" | "updatedAt">) => CharacterProfile;
  updateCharacter: (id: string, updates: Partial<CharacterProfile>) => void;
  deleteCharacter: (id: string) => void;
  duplicateCharacter: (id: string) => CharacterProfile | null;
  
  // WARDROBE CRUD
  wardrobes: WardrobeProfile[];
  addWardrobe: (data: Omit<WardrobeProfile, "id" | "createdAt" | "updatedAt">) => WardrobeProfile;
  updateWardrobe: (id: string, updates: Partial<WardrobeProfile>) => void;
  deleteWardrobe: (id: string) => void;
  duplicateWardrobe: (id: string) => WardrobeProfile | null;
  
  // LENS CRUD
  lenses: LensProfile[];
  addLens: (data: Omit<LensProfile, "id" | "createdAt" | "updatedAt">) => LensProfile;
  updateLens: (id: string, updates: Partial<LensProfile>) => void;
  deleteLens: (id: string) => void;
  duplicateLens: (id: string) => LensProfile | null;
  
  // LOOK CRUD
  looks: LookFamily[];
  addLook: (data: Omit<LookFamily, "id" | "createdAt" | "updatedAt">) => LookFamily;
  updateLook: (id: string, updates: Partial<LookFamily>) => void;
  deleteLook: (id: string) => void;
  duplicateLook: (id: string) => LookFamily | null;
  
  // MICRO TEXTURE CRUD
  microTextures: MicroTexturePack[];
  addMicroTexture: (data: Omit<MicroTexturePack, "id" | "createdAt" | "updatedAt">) => MicroTexturePack;
  updateMicroTexture: (id: string, updates: Partial<MicroTexturePack>) => void;
  deleteMicroTexture: (id: string) => void;
  duplicateMicroTexture: (id: string) => MicroTexturePack | null;
  
  // MICRO DETAIL CRUD
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
      
      // Check for previously open project FIRST (from localStorage)
      const savedProjectId = getCurrentProjectId();
      
      if (savedProjectId) {
        // Try to load the saved project immediately from local
        const localProject = getLocalProject(savedProjectId);
        if (localProject) {
          setCurrentProject(localProject);
          currentProjectRef.current = localProject;
          
          // Check for previously open prompt
          const savedPromptId = getCurrentPromptId();
          if (savedPromptId && localProject.prompts.some((p) => p.id === savedPromptId)) {
            setCurrentPromptIdState(savedPromptId);
          }
        }
        
        // Then try to get from Azure (will update if newer)
        const { project, storageMode: projectMode } = await fetchProject(savedProjectId);
        if (project) {
          setCurrentProject(project);
          currentProjectRef.current = project;
          setStorageMode(projectMode);
        }
      }
      
      // Load projects list
      const { projects: loadedProjects, storageMode: mode } = await fetchProjects();
      setProjects(loadedProjects);
      setStorageMode(mode);
      
      setProjectsLoading(false);
    };

    loadInitialData();
  }, []);

  // ============================================
  // AUTO-SAVE
  // ============================================

  const saveNow = useCallback(async (): Promise<boolean> => {
    const projectToSave = currentProjectRef.current;
    
    if (!projectToSave) {
      return false;
    }
    
    if (isSavingRef.current) {
      return false;
    }
    
    setIsSaving(true);
    isSavingRef.current = true;
    pendingSaveRef.current = false;
    
    try {
      const result = await apiSaveProject(projectToSave);
      setStorageMode(result.storageMode);
      setLastSaved(new Date());
      return result.success;
    } catch (error) {
      console.error("[useProject] Error saving project:", error);
      return false;
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, []);

  // Schedule auto-save - 1 second debounce
  const scheduleAutoSave = useCallback(() => {
    pendingSaveRef.current = true;
    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (pendingSaveRef.current) {
        saveNow();
      }
    }, 1000);
  }, [saveNow]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      // Save immediately on unmount if pending
      if (pendingSaveRef.current && currentProjectRef.current) {
        saveLocalProject(currentProjectRef.current);
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
    
    // Try local first for instant load
    const localProject = getLocalProject(id);
    if (localProject) {
      setCurrentProject(localProject);
      currentProjectRef.current = localProject;
      setCurrentProjectId(id);
      setCurrentPromptIdState(null);
      setCurrentPromptId(null);
    }
    
    // Then fetch from Azure
    const { project, storageMode: mode } = await fetchProject(id);
    
    if (project) {
      setCurrentProject(project);
      currentProjectRef.current = project;
      setStorageMode(mode);
      setCurrentProjectId(id);
    }
    
    setProjectLoading(false);
  }, []);

  const closeProject = useCallback(async () => {
    // Save before closing
    if (currentProjectRef.current) {
      await saveNow();
    }
    
    setCurrentProject(null);
    currentProjectRef.current = null;
    setCurrentPromptIdState(null);
    setCurrentProjectId(null);
    setCurrentPromptId(null);
    
    await refreshProjects();
  }, [saveNow, refreshProjects]);

  const createProject = useCallback(async (name: string): Promise<Project> => {
    const { project, storageMode: mode } = await apiCreateProject(name);
    setStorageMode(mode);
    
    // Open the new project
    setCurrentProject(project);
    currentProjectRef.current = project;
    setCurrentProjectId(project.id);
    
    // Refresh project list
    await refreshProjects();
    
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
    
    await refreshProjects();
  }, [currentProject, refreshProjects]);

  const renameProject = useCallback((name: string) => {
    if (!currentProject) return;
    
    const updated = {
      ...currentProject,
      name,
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
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
    
    if (!currentProject) return newPrompt;
    
    const updated = {
      ...currentProject,
      prompts: [...currentProject.prompts, newPrompt],
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    
    setCurrentPromptIdState(newPrompt.id);
    setCurrentPromptId(newPrompt.id);
    
    scheduleAutoSave();
    
    return newPrompt;
  }, [currentProject, scheduleAutoSave]);

  const deletePrompt = useCallback((id: string) => {
    if (!currentProject) return;
    
    const updated = {
      ...currentProject,
      prompts: currentProject.prompts.filter((p) => p.id !== id),
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    
    if (currentPromptId === id) {
      setCurrentPromptIdState(null);
      setCurrentPromptId(null);
    }
    
    scheduleAutoSave();
  }, [currentProject, currentPromptId, scheduleAutoSave]);

  const renamePrompt = useCallback((id: string, title: string) => {
    if (!currentProject) return;
    
    const updated = {
      ...currentProject,
      prompts: currentProject.prompts.map((p) =>
        p.id === id ? { ...p, title, updatedAt: now() } : p
      ),
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
  }, [currentProject, scheduleAutoSave]);

  const duplicatePrompt = useCallback((id: string): ProjectPrompt | null => {
    if (!currentProject) return null;
    
    const original = currentProject.prompts.find((p) => p.id === id);
    if (!original) return null;
    
    const duplicate = createNewPrompt(`${original.title} (Copy)`);
    duplicate.promptRequest = { ...original.promptRequest };
    
    const updated = {
      ...currentProject,
      prompts: [...currentProject.prompts, duplicate],
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
    
    return duplicate;
  }, [currentProject, scheduleAutoSave]);

  // ============================================
  // PROMPT DATA OPERATIONS
  // ============================================

  const updatePromptRequest = useCallback((updates: Partial<PromptRequest>) => {
    if (!currentProject || !currentPromptId) return;
    
    const updated = {
      ...currentProject,
      prompts: currentProject.prompts.map((p) =>
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
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
  }, [currentProject, currentPromptId, scheduleAutoSave]);

  const saveHistoryEntry = useCallback((note?: string): PromptHistoryEntry | null => {
    if (!currentProject || !currentPromptId) return null;
    
    const prompt = currentProject.prompts.find((p) => p.id === currentPromptId);
    if (!prompt) return null;
    
    let entry: PromptHistoryEntry | null = null;
    
    const updated = {
      ...currentProject,
      prompts: currentProject.prompts.map((p) => {
        if (p.id === currentPromptId) {
          const newPrompt = { ...p };
          entry = addHistoryEntry(newPrompt, note);
          return newPrompt;
        }
        return p;
      }),
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    saveNow();
    
    return entry;
  }, [currentProject, currentPromptId, saveNow]);

  const restoreFromHistory = useCallback((historyId: string) => {
    if (!currentProject || !currentPromptId) return;
    
    const prompt = currentProject.prompts.find((p) => p.id === currentPromptId);
    if (!prompt) return;
    
    const historyEntry = prompt.history.find((h) => h.id === historyId);
    if (!historyEntry) return;
    
    const updated = {
      ...currentProject,
      prompts: currentProject.prompts.map((p) =>
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
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
  }, [currentProject, currentPromptId, scheduleAutoSave]);

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
    
    if (!currentProject) return newChar;
    
    const updated = {
      ...currentProject,
      characters: [...currentProject.characters, newChar],
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
    return newChar;
  }, [currentProject, scheduleAutoSave]);

  const updateCharacter = useCallback((id: string, updates: Partial<CharacterProfile>) => {
    if (!currentProject) return;
    
    const updated = {
      ...currentProject,
      characters: currentProject.characters.map((c) =>
        c.id === id ? { ...c, ...updates, id, createdAt: c.createdAt, updatedAt: now() } : c
      ),
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
  }, [currentProject, scheduleAutoSave]);

  const deleteCharacter = useCallback((id: string) => {
    if (!currentProject) return;
    
    const updated = {
      ...currentProject,
      characters: currentProject.characters.filter((c) => c.id !== id),
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
  }, [currentProject, scheduleAutoSave]);

  const duplicateCharacter = useCallback((id: string): CharacterProfile | null => {
    if (!currentProject) return null;
    
    const original = currentProject.characters.find((c) => c.id === id);
    if (!original) return null;
    
    const duplicate: CharacterProfile = {
      ...original,
      id: generateId(),
      uiName: `${original.uiName} (Copy)`,
      createdAt: now(),
      updatedAt: now(),
    };
    
    const updated = {
      ...currentProject,
      characters: [...currentProject.characters, duplicate],
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
    return duplicate;
  }, [currentProject, scheduleAutoSave]);

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
    
    if (!currentProject) return newWardrobe;
    
    const updated = {
      ...currentProject,
      wardrobes: [...currentProject.wardrobes, newWardrobe],
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
    return newWardrobe;
  }, [currentProject, scheduleAutoSave]);

  const updateWardrobe = useCallback((id: string, updates: Partial<WardrobeProfile>) => {
    if (!currentProject) return;
    
    const updated = {
      ...currentProject,
      wardrobes: currentProject.wardrobes.map((w) =>
        w.id === id ? { ...w, ...updates, id, createdAt: w.createdAt, updatedAt: now() } : w
      ),
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
  }, [currentProject, scheduleAutoSave]);

  const deleteWardrobe = useCallback((id: string) => {
    if (!currentProject) return;
    
    const updated = {
      ...currentProject,
      wardrobes: currentProject.wardrobes.filter((w) => w.id !== id),
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
  }, [currentProject, scheduleAutoSave]);

  const duplicateWardrobe = useCallback((id: string): WardrobeProfile | null => {
    if (!currentProject) return null;
    
    const original = currentProject.wardrobes.find((w) => w.id === id);
    if (!original) return null;
    
    const duplicate: WardrobeProfile = {
      ...original,
      id: generateId(),
      uiName: `${original.uiName} (Copy)`,
      createdAt: now(),
      updatedAt: now(),
    };
    
    const updated = {
      ...currentProject,
      wardrobes: [...currentProject.wardrobes, duplicate],
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
    return duplicate;
  }, [currentProject, scheduleAutoSave]);

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
    
    if (!currentProject) return newLens;
    
    const updated = {
      ...currentProject,
      lenses: [...currentProject.lenses, newLens],
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
    return newLens;
  }, [currentProject, scheduleAutoSave]);

  const updateLens = useCallback((id: string, updates: Partial<LensProfile>) => {
    if (!currentProject) return;
    
    const updated = {
      ...currentProject,
      lenses: currentProject.lenses.map((l) =>
        l.id === id ? { ...l, ...updates, id, createdAt: l.createdAt, updatedAt: now() } : l
      ),
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
  }, [currentProject, scheduleAutoSave]);

  const deleteLens = useCallback((id: string) => {
    if (!currentProject) return;
    
    const updated = {
      ...currentProject,
      lenses: currentProject.lenses.filter((l) => l.id !== id),
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
  }, [currentProject, scheduleAutoSave]);

  const duplicateLens = useCallback((id: string): LensProfile | null => {
    if (!currentProject) return null;
    
    const original = currentProject.lenses.find((l) => l.id === id);
    if (!original) return null;
    
    const duplicate: LensProfile = {
      ...original,
      id: generateId(),
      uiName: `${original.uiName} (Copy)`,
      createdAt: now(),
      updatedAt: now(),
    };
    
    const updated = {
      ...currentProject,
      lenses: [...currentProject.lenses, duplicate],
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
    return duplicate;
  }, [currentProject, scheduleAutoSave]);

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
    
    if (!currentProject) return newLook;
    
    const updated = {
      ...currentProject,
      looks: [...currentProject.looks, newLook],
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
    return newLook;
  }, [currentProject, scheduleAutoSave]);

  const updateLook = useCallback((id: string, updates: Partial<LookFamily>) => {
    if (!currentProject) return;
    
    const updated = {
      ...currentProject,
      looks: currentProject.looks.map((l) =>
        l.id === id ? { ...l, ...updates, id, createdAt: l.createdAt, updatedAt: now() } : l
      ),
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
  }, [currentProject, scheduleAutoSave]);

  const deleteLook = useCallback((id: string) => {
    if (!currentProject) return;
    
    const updated = {
      ...currentProject,
      looks: currentProject.looks.filter((l) => l.id !== id),
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
  }, [currentProject, scheduleAutoSave]);

  const duplicateLook = useCallback((id: string): LookFamily | null => {
    if (!currentProject) return null;
    
    const original = currentProject.looks.find((l) => l.id === id);
    if (!original) return null;
    
    const duplicate: LookFamily = {
      ...original,
      id: generateId(),
      uiName: `${original.uiName} (Copy)`,
      createdAt: now(),
      updatedAt: now(),
    };
    
    const updated = {
      ...currentProject,
      looks: [...currentProject.looks, duplicate],
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
    return duplicate;
  }, [currentProject, scheduleAutoSave]);

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
    
    if (!currentProject) return newPack;
    
    const updated = {
      ...currentProject,
      microTextures: [...currentProject.microTextures, newPack],
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
    return newPack;
  }, [currentProject, scheduleAutoSave]);

  const updateMicroTexture = useCallback((id: string, updates: Partial<MicroTexturePack>) => {
    if (!currentProject) return;
    
    const updated = {
      ...currentProject,
      microTextures: currentProject.microTextures.map((m) =>
        m.id === id ? { ...m, ...updates, id, createdAt: m.createdAt, updatedAt: now() } : m
      ),
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
  }, [currentProject, scheduleAutoSave]);

  const deleteMicroTexture = useCallback((id: string) => {
    if (!currentProject) return;
    
    const updated = {
      ...currentProject,
      microTextures: currentProject.microTextures.filter((m) => m.id !== id),
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
  }, [currentProject, scheduleAutoSave]);

  const duplicateMicroTexture = useCallback((id: string): MicroTexturePack | null => {
    if (!currentProject) return null;
    
    const original = currentProject.microTextures.find((m) => m.id === id);
    if (!original) return null;
    
    const duplicate: MicroTexturePack = {
      ...original,
      id: generateId(),
      uiName: `${original.uiName} (Copy)`,
      createdAt: now(),
      updatedAt: now(),
    };
    
    const updated = {
      ...currentProject,
      microTextures: [...currentProject.microTextures, duplicate],
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
    return duplicate;
  }, [currentProject, scheduleAutoSave]);

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
    
    if (!currentProject) return newPack;
    
    const updated = {
      ...currentProject,
      microDetails: [...currentProject.microDetails, newPack],
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
    return newPack;
  }, [currentProject, scheduleAutoSave]);

  const updateMicroDetail = useCallback((id: string, updates: Partial<MicroDetailPack>) => {
    if (!currentProject) return;
    
    const updated = {
      ...currentProject,
      microDetails: currentProject.microDetails.map((m) =>
        m.id === id ? { ...m, ...updates, id, createdAt: m.createdAt, updatedAt: now() } : m
      ),
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
  }, [currentProject, scheduleAutoSave]);

  const deleteMicroDetail = useCallback((id: string) => {
    if (!currentProject) return;
    
    const updated = {
      ...currentProject,
      microDetails: currentProject.microDetails.filter((m) => m.id !== id),
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
  }, [currentProject, scheduleAutoSave]);

  const duplicateMicroDetail = useCallback((id: string): MicroDetailPack | null => {
    if (!currentProject) return null;
    
    const original = currentProject.microDetails.find((m) => m.id === id);
    if (!original) return null;
    
    const duplicate: MicroDetailPack = {
      ...original,
      id: generateId(),
      uiName: `${original.uiName} (Copy)`,
      createdAt: now(),
      updatedAt: now(),
    };
    
    const updated = {
      ...currentProject,
      microDetails: [...currentProject.microDetails, duplicate],
      updatedAt: now(),
    };
    setCurrentProject(updated);
    currentProjectRef.current = updated;
    scheduleAutoSave();
    return duplicate;
  }, [currentProject, scheduleAutoSave]);

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

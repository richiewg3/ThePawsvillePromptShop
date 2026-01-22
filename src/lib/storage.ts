/**
 * Storage utilities
 * 
 * NOTE: Project data (characters, wardrobes, lenses, looks, etc.) is now stored
 * within projects and saved to Azure Blob Storage. The localStorage functions
 * in this file are kept only for backwards compatibility and should not be used
 * for new development.
 * 
 * Use the useProject() hook from @/hooks/useProject for all data operations.
 */

// ============================================
// UTILITY FUNCTIONS (still used)
// ============================================

/**
 * Download a JSON object as a file
 */
export function downloadJson(data: object, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// DEPRECATED: Local Storage Functions
// 
// These functions are kept for backwards compatibility only.
// All project data should now be managed through the useProject() hook
// which saves to Azure Blob Storage.
// ============================================

import {
  CharacterProfile,
  WardrobeProfile,
  LensProfile,
  LookFamily,
  MicroTexturePack,
  MicroDetailPack,
  PromptRequest,
  CharacterProfileSchema,
  WardrobeProfileSchema,
  LensProfileSchema,
  LookFamilySchema,
  MicroTexturePackSchema,
  MicroDetailPackSchema,
} from "./schemas";
import { z } from "zod";
import {
  defaultLookFamilies,
  defaultLensProfiles,
  defaultMicroTexturePacks,
  defaultMicroDetailPacks,
} from "@/data/defaults";

const STORAGE_KEYS = {
  characters: "pawsville_characters",
  wardrobes: "pawsville_wardrobes",
  lenses: "pawsville_lenses",
  looks: "pawsville_looks",
  microTextures: "pawsville_micro_textures",
  microDetails: "pawsville_micro_details",
  currentDraft: "pawsville_current_draft",
  initialized: "pawsville_initialized",
} as const;

function getItem<T>(key: string, schema: z.ZodType<T>): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return z.array(schema).parse(parsed);
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return [];
  }
}

function setItem<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

/** @deprecated Use useProject() hook instead */
export function initializeStorage(): void {
  if (typeof window === "undefined") return;
  
  const initialized = localStorage.getItem(STORAGE_KEYS.initialized);
  if (initialized) return;

  setItem(STORAGE_KEYS.looks, defaultLookFamilies);
  setItem(STORAGE_KEYS.lenses, defaultLensProfiles);
  setItem(STORAGE_KEYS.microTextures, defaultMicroTexturePacks);
  setItem(STORAGE_KEYS.microDetails, defaultMicroDetailPacks);
  setItem(STORAGE_KEYS.characters, []);
  setItem(STORAGE_KEYS.wardrobes, []);

  localStorage.setItem(STORAGE_KEYS.initialized, "true");
}

/** @deprecated Use useProject() hook instead */
export function getCharacters(): CharacterProfile[] {
  return getItem(STORAGE_KEYS.characters, CharacterProfileSchema);
}

/** @deprecated Use useProject() hook instead */
export function saveCharacter(profile: Omit<CharacterProfile, "id" | "createdAt" | "updatedAt">): CharacterProfile {
  const characters = getCharacters();
  const newProfile: CharacterProfile = {
    ...profile,
    id: generateId(),
    createdAt: now(),
    updatedAt: now(),
  };
  characters.push(newProfile);
  setItem(STORAGE_KEYS.characters, characters);
  return newProfile;
}

/** @deprecated Use useProject() hook instead */
export function updateCharacter(id: string, updates: Partial<CharacterProfile>): CharacterProfile | null {
  const characters = getCharacters();
  const index = characters.findIndex((c) => c.id === id);
  if (index === -1) return null;
  
  characters[index] = {
    ...characters[index],
    ...updates,
    id,
    createdAt: characters[index].createdAt,
    updatedAt: now(),
  };
  setItem(STORAGE_KEYS.characters, characters);
  return characters[index];
}

/** @deprecated Use useProject() hook instead */
export function deleteCharacter(id: string): boolean {
  const characters = getCharacters();
  const filtered = characters.filter((c) => c.id !== id);
  if (filtered.length === characters.length) return false;
  setItem(STORAGE_KEYS.characters, filtered);
  return true;
}

/** @deprecated Use useProject() hook instead */
export function duplicateCharacter(id: string): CharacterProfile | null {
  const characters = getCharacters();
  const original = characters.find((c) => c.id === id);
  if (!original) return null;
  
  const duplicate: CharacterProfile = {
    ...original,
    id: generateId(),
    uiName: `${original.uiName} (Copy)`,
    createdAt: now(),
    updatedAt: now(),
  };
  characters.push(duplicate);
  setItem(STORAGE_KEYS.characters, characters);
  return duplicate;
}

/** @deprecated Use useProject() hook instead */
export function getWardrobes(): WardrobeProfile[] {
  return getItem(STORAGE_KEYS.wardrobes, WardrobeProfileSchema);
}

/** @deprecated Use useProject() hook instead */
export function saveWardrobe(profile: Omit<WardrobeProfile, "id" | "createdAt" | "updatedAt">): WardrobeProfile {
  const wardrobes = getWardrobes();
  const newProfile: WardrobeProfile = {
    ...profile,
    id: generateId(),
    createdAt: now(),
    updatedAt: now(),
  };
  wardrobes.push(newProfile);
  setItem(STORAGE_KEYS.wardrobes, wardrobes);
  return newProfile;
}

/** @deprecated Use useProject() hook instead */
export function updateWardrobe(id: string, updates: Partial<WardrobeProfile>): WardrobeProfile | null {
  const wardrobes = getWardrobes();
  const index = wardrobes.findIndex((w) => w.id === id);
  if (index === -1) return null;
  
  wardrobes[index] = {
    ...wardrobes[index],
    ...updates,
    id,
    createdAt: wardrobes[index].createdAt,
    updatedAt: now(),
  };
  setItem(STORAGE_KEYS.wardrobes, wardrobes);
  return wardrobes[index];
}

/** @deprecated Use useProject() hook instead */
export function deleteWardrobe(id: string): boolean {
  const wardrobes = getWardrobes();
  const filtered = wardrobes.filter((w) => w.id !== id);
  if (filtered.length === wardrobes.length) return false;
  setItem(STORAGE_KEYS.wardrobes, filtered);
  return true;
}

/** @deprecated Use useProject() hook instead */
export function duplicateWardrobe(id: string): WardrobeProfile | null {
  const wardrobes = getWardrobes();
  const original = wardrobes.find((w) => w.id === id);
  if (!original) return null;
  
  const duplicate: WardrobeProfile = {
    ...original,
    id: generateId(),
    uiName: `${original.uiName} (Copy)`,
    createdAt: now(),
    updatedAt: now(),
  };
  wardrobes.push(duplicate);
  setItem(STORAGE_KEYS.wardrobes, wardrobes);
  return duplicate;
}

/** @deprecated Use useProject() hook instead */
export function getLenses(): LensProfile[] {
  return getItem(STORAGE_KEYS.lenses, LensProfileSchema);
}

/** @deprecated Use useProject() hook instead */
export function saveLens(profile: Omit<LensProfile, "id" | "createdAt" | "updatedAt">): LensProfile {
  const lenses = getLenses();
  const newProfile: LensProfile = {
    ...profile,
    id: generateId(),
    createdAt: now(),
    updatedAt: now(),
  };
  lenses.push(newProfile);
  setItem(STORAGE_KEYS.lenses, lenses);
  return newProfile;
}

/** @deprecated Use useProject() hook instead */
export function updateLens(id: string, updates: Partial<LensProfile>): LensProfile | null {
  const lenses = getLenses();
  const index = lenses.findIndex((l) => l.id === id);
  if (index === -1) return null;
  
  lenses[index] = {
    ...lenses[index],
    ...updates,
    id,
    createdAt: lenses[index].createdAt,
    updatedAt: now(),
  };
  setItem(STORAGE_KEYS.lenses, lenses);
  return lenses[index];
}

/** @deprecated Use useProject() hook instead */
export function deleteLens(id: string): boolean {
  const lenses = getLenses();
  const filtered = lenses.filter((l) => l.id !== id);
  if (filtered.length === lenses.length) return false;
  setItem(STORAGE_KEYS.lenses, filtered);
  return true;
}

/** @deprecated Use useProject() hook instead */
export function duplicateLens(id: string): LensProfile | null {
  const lenses = getLenses();
  const original = lenses.find((l) => l.id === id);
  if (!original) return null;
  
  const duplicate: LensProfile = {
    ...original,
    id: generateId(),
    uiName: `${original.uiName} (Copy)`,
    createdAt: now(),
    updatedAt: now(),
  };
  lenses.push(duplicate);
  setItem(STORAGE_KEYS.lenses, lenses);
  return duplicate;
}

/** @deprecated Use useProject() hook instead */
export function getLooks(): LookFamily[] {
  return getItem(STORAGE_KEYS.looks, LookFamilySchema);
}

/** @deprecated Use useProject() hook instead */
export function saveLook(profile: Omit<LookFamily, "id" | "createdAt" | "updatedAt">): LookFamily {
  const looks = getLooks();
  const newProfile: LookFamily = {
    ...profile,
    id: generateId(),
    createdAt: now(),
    updatedAt: now(),
  };
  looks.push(newProfile);
  setItem(STORAGE_KEYS.looks, looks);
  return newProfile;
}

/** @deprecated Use useProject() hook instead */
export function updateLook(id: string, updates: Partial<LookFamily>): LookFamily | null {
  const looks = getLooks();
  const index = looks.findIndex((l) => l.id === id);
  if (index === -1) return null;
  
  looks[index] = {
    ...looks[index],
    ...updates,
    id,
    createdAt: looks[index].createdAt,
    updatedAt: now(),
  };
  setItem(STORAGE_KEYS.looks, looks);
  return looks[index];
}

/** @deprecated Use useProject() hook instead */
export function deleteLook(id: string): boolean {
  const looks = getLooks();
  const filtered = looks.filter((l) => l.id !== id);
  if (filtered.length === looks.length) return false;
  setItem(STORAGE_KEYS.looks, filtered);
  return true;
}

/** @deprecated Use useProject() hook instead */
export function duplicateLook(id: string): LookFamily | null {
  const looks = getLooks();
  const original = looks.find((l) => l.id === id);
  if (!original) return null;
  
  const duplicate: LookFamily = {
    ...original,
    id: generateId(),
    uiName: `${original.uiName} (Copy)`,
    createdAt: now(),
    updatedAt: now(),
  };
  looks.push(duplicate);
  setItem(STORAGE_KEYS.looks, looks);
  return duplicate;
}

/** @deprecated Use useProject() hook instead */
export function getMicroTextures(): MicroTexturePack[] {
  return getItem(STORAGE_KEYS.microTextures, MicroTexturePackSchema);
}

/** @deprecated Use useProject() hook instead */
export function saveMicroTexture(pack: Omit<MicroTexturePack, "id" | "createdAt" | "updatedAt">): MicroTexturePack {
  const packs = getMicroTextures();
  const newPack: MicroTexturePack = {
    ...pack,
    id: generateId(),
    createdAt: now(),
    updatedAt: now(),
  };
  packs.push(newPack);
  setItem(STORAGE_KEYS.microTextures, packs);
  return newPack;
}

/** @deprecated Use useProject() hook instead */
export function updateMicroTexture(id: string, updates: Partial<MicroTexturePack>): MicroTexturePack | null {
  const packs = getMicroTextures();
  const index = packs.findIndex((p) => p.id === id);
  if (index === -1) return null;
  
  packs[index] = {
    ...packs[index],
    ...updates,
    id,
    createdAt: packs[index].createdAt,
    updatedAt: now(),
  };
  setItem(STORAGE_KEYS.microTextures, packs);
  return packs[index];
}

/** @deprecated Use useProject() hook instead */
export function deleteMicroTexture(id: string): boolean {
  const packs = getMicroTextures();
  const filtered = packs.filter((p) => p.id !== id);
  if (filtered.length === packs.length) return false;
  setItem(STORAGE_KEYS.microTextures, filtered);
  return true;
}

/** @deprecated Use useProject() hook instead */
export function duplicateMicroTexture(id: string): MicroTexturePack | null {
  const packs = getMicroTextures();
  const original = packs.find((p) => p.id === id);
  if (!original) return null;
  
  const duplicate: MicroTexturePack = {
    ...original,
    id: generateId(),
    uiName: `${original.uiName} (Copy)`,
    createdAt: now(),
    updatedAt: now(),
  };
  packs.push(duplicate);
  setItem(STORAGE_KEYS.microTextures, packs);
  return duplicate;
}

/** @deprecated Use useProject() hook instead */
export function getMicroDetails(): MicroDetailPack[] {
  return getItem(STORAGE_KEYS.microDetails, MicroDetailPackSchema);
}

/** @deprecated Use useProject() hook instead */
export function saveMicroDetail(pack: Omit<MicroDetailPack, "id" | "createdAt" | "updatedAt">): MicroDetailPack {
  const packs = getMicroDetails();
  const newPack: MicroDetailPack = {
    ...pack,
    id: generateId(),
    createdAt: now(),
    updatedAt: now(),
  };
  packs.push(newPack);
  setItem(STORAGE_KEYS.microDetails, packs);
  return newPack;
}

/** @deprecated Use useProject() hook instead */
export function updateMicroDetail(id: string, updates: Partial<MicroDetailPack>): MicroDetailPack | null {
  const packs = getMicroDetails();
  const index = packs.findIndex((p) => p.id === id);
  if (index === -1) return null;
  
  packs[index] = {
    ...packs[index],
    ...updates,
    id,
    createdAt: packs[index].createdAt,
    updatedAt: now(),
  };
  setItem(STORAGE_KEYS.microDetails, packs);
  return packs[index];
}

/** @deprecated Use useProject() hook instead */
export function deleteMicroDetail(id: string): boolean {
  const packs = getMicroDetails();
  const filtered = packs.filter((p) => p.id !== id);
  if (filtered.length === packs.length) return false;
  setItem(STORAGE_KEYS.microDetails, filtered);
  return true;
}

/** @deprecated Use useProject() hook instead */
export function duplicateMicroDetail(id: string): MicroDetailPack | null {
  const packs = getMicroDetails();
  const original = packs.find((p) => p.id === id);
  if (!original) return null;
  
  const duplicate: MicroDetailPack = {
    ...original,
    id: generateId(),
    uiName: `${original.uiName} (Copy)`,
    createdAt: now(),
    updatedAt: now(),
  };
  packs.push(duplicate);
  setItem(STORAGE_KEYS.microDetails, packs);
  return duplicate;
}

/** @deprecated Use useProject() hook instead */
export function getCurrentDraft(): Partial<PromptRequest> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.currentDraft);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** @deprecated Use useProject() hook instead */
export function saveCurrentDraft(draft: Partial<PromptRequest>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.currentDraft, JSON.stringify({
    ...draft,
    updatedAt: now(),
  }));
}

/** @deprecated Use useProject() hook instead */
export function clearCurrentDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.currentDraft);
}

/** @deprecated Use useProject() hook instead */
export function resetToDefaults(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.initialized);
  localStorage.removeItem(STORAGE_KEYS.characters);
  localStorage.removeItem(STORAGE_KEYS.wardrobes);
  localStorage.removeItem(STORAGE_KEYS.looks);
  localStorage.removeItem(STORAGE_KEYS.lenses);
  localStorage.removeItem(STORAGE_KEYS.microTextures);
  localStorage.removeItem(STORAGE_KEYS.microDetails);
  localStorage.removeItem(STORAGE_KEYS.currentDraft);
  initializeStorage();
}

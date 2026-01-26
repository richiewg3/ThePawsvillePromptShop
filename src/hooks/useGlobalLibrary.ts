"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CharacterProfile, WardrobeProfile } from "@/lib/schemas";

const STORAGE_KEYS = {
  characters: "pawsville_global_characters",
  wardrobes: "pawsville_global_wardrobes",
  importFlag: "pawsville_global_imported",
} as const;

function readStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.error(`[GlobalLibrary] Failed to read ${key}:`, error);
    return [];
  }
}

function writeStorage<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(key) === "true";
}

function writeFlag(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value ? "true" : "false");
}

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export interface UseGlobalLibraryReturn {
  globalCharacters: CharacterProfile[];
  globalWardrobes: WardrobeProfile[];
  storageMode: "azure" | "local";
  isSyncing: boolean;
  syncError: string | null;
  hasLegacyData: boolean;
  legacyConflictCount: number;
  importLegacyToCloud: (options?: { overwriteConflicts?: boolean }) => Promise<void>;
  addGlobalCharacter: (data: Omit<CharacterProfile, "id" | "createdAt" | "updatedAt">) => CharacterProfile;
  updateGlobalCharacter: (id: string, updates: Partial<CharacterProfile>) => void;
  deleteGlobalCharacter: (id: string) => void;
  addGlobalWardrobe: (data: Omit<WardrobeProfile, "id" | "createdAt" | "updatedAt">) => WardrobeProfile;
  updateGlobalWardrobe: (id: string, updates: Partial<WardrobeProfile>) => void;
  deleteGlobalWardrobe: (id: string) => void;
  refreshGlobalLibrary: () => void;
}

export function useGlobalLibrary(): UseGlobalLibraryReturn {
  const [globalCharacters, setGlobalCharacters] = useState<CharacterProfile[]>([]);
  const [globalWardrobes, setGlobalWardrobes] = useState<WardrobeProfile[]>([]);
  const [storageMode, setStorageMode] = useState<"azure" | "local">("local");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [legacyCharacters, setLegacyCharacters] = useState<CharacterProfile[]>([]);
  const [legacyWardrobes, setLegacyWardrobes] = useState<WardrobeProfile[]>([]);

  const skipSyncRef = useRef({ characters: true, wardrobes: true });

  const hasLegacyData = useMemo(() => {
    if (readFlag(STORAGE_KEYS.importFlag)) return false;
    return legacyCharacters.length > 0 || legacyWardrobes.length > 0;
  }, [legacyCharacters, legacyWardrobes]);

  const legacyConflictCount = useMemo(() => {
    const existingCharacterNames = new Set(globalCharacters.map((entry) => entry.uiName.toLowerCase()));
    const existingWardrobeNames = new Set(globalWardrobes.map((entry) => entry.uiName.toLowerCase()));
    const characterConflicts = legacyCharacters.filter((entry) => existingCharacterNames.has(entry.uiName.toLowerCase())).length;
    const wardrobeConflicts = legacyWardrobes.filter((entry) => existingWardrobeNames.has(entry.uiName.toLowerCase())).length;
    return characterConflicts + wardrobeConflicts;
  }, [globalCharacters, globalWardrobes, legacyCharacters, legacyWardrobes]);

  const fetchGlobalCollection = useCallback(async (path: string) => {
    const response = await fetch(path);
    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error?.message || "Failed to fetch global data");
    }
    return data.data as { items: CharacterProfile[] | WardrobeProfile[]; storageMode: "azure" | "local" };
  }, []);

  const refreshGlobalLibrary = useCallback(() => {
    setLegacyCharacters(readStorage<CharacterProfile>(STORAGE_KEYS.characters));
    setLegacyWardrobes(readStorage<WardrobeProfile>(STORAGE_KEYS.wardrobes));

    const loadFromApi = async () => {
      try {
        const [charactersResponse, wardrobesResponse] = await Promise.all([
          fetchGlobalCollection("/api/global/characters"),
          fetchGlobalCollection("/api/global/wardrobes"),
        ]);

        if (charactersResponse.storageMode === "azure" && wardrobesResponse.storageMode === "azure") {
          setStorageMode("azure");
          skipSyncRef.current = { characters: true, wardrobes: true };
          setGlobalCharacters(charactersResponse.items as CharacterProfile[]);
          setGlobalWardrobes(wardrobesResponse.items as WardrobeProfile[]);
          return;
        }
      } catch (error) {
        console.error("[GlobalLibrary] Failed to fetch cloud globals:", error);
      }

      setStorageMode("local");
      setGlobalCharacters(readStorage<CharacterProfile>(STORAGE_KEYS.characters));
      setGlobalWardrobes(readStorage<WardrobeProfile>(STORAGE_KEYS.wardrobes));
    };

    void loadFromApi();
  }, [fetchGlobalCollection]);

  useEffect(() => {
    refreshGlobalLibrary();
  }, [refreshGlobalLibrary]);

  useEffect(() => {
    if (storageMode === "local") {
      writeStorage(STORAGE_KEYS.characters, globalCharacters);
    }
  }, [globalCharacters, storageMode]);

  useEffect(() => {
    if (storageMode === "local") {
      writeStorage(STORAGE_KEYS.wardrobes, globalWardrobes);
    }
  }, [globalWardrobes, storageMode]);

  useEffect(() => {
    if (storageMode !== "azure") return;
    if (skipSyncRef.current.characters) {
      skipSyncRef.current.characters = false;
      return;
    }
    const sync = async () => {
      try {
        setIsSyncing(true);
        setSyncError(null);
        const response = await fetch("/api/global/characters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: globalCharacters }),
        });
        const data = await response.json();
        if (!data.ok) {
          throw new Error(data.error?.message || "Failed to sync global characters");
        }
      } catch (error) {
        console.error("[GlobalLibrary] Failed to sync characters:", error);
        setSyncError(error instanceof Error ? error.message : "Failed to sync global characters");
      } finally {
        setIsSyncing(false);
      }
    };
    void sync();
  }, [globalCharacters, storageMode]);

  useEffect(() => {
    if (storageMode !== "azure") return;
    if (skipSyncRef.current.wardrobes) {
      skipSyncRef.current.wardrobes = false;
      return;
    }
    const sync = async () => {
      try {
        setIsSyncing(true);
        setSyncError(null);
        const response = await fetch("/api/global/wardrobes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: globalWardrobes }),
        });
        const data = await response.json();
        if (!data.ok) {
          throw new Error(data.error?.message || "Failed to sync global wardrobes");
        }
      } catch (error) {
        console.error("[GlobalLibrary] Failed to sync wardrobes:", error);
        setSyncError(error instanceof Error ? error.message : "Failed to sync global wardrobes");
      } finally {
        setIsSyncing(false);
      }
    };
    void sync();
  }, [globalWardrobes, storageMode]);

  const addGlobalCharacter = useCallback((data: Omit<CharacterProfile, "id" | "createdAt" | "updatedAt">): CharacterProfile => {
    const newEntry: CharacterProfile = {
      ...data,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    };
    setGlobalCharacters((prev) => [newEntry, ...prev]);
    return newEntry;
  }, []);

  const updateGlobalCharacter = useCallback((id: string, updates: Partial<CharacterProfile>) => {
    setGlobalCharacters((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates, id, createdAt: entry.createdAt, updatedAt: now() } : entry))
    );
  }, []);

  const deleteGlobalCharacter = useCallback((id: string) => {
    setGlobalCharacters((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const addGlobalWardrobe = useCallback((data: Omit<WardrobeProfile, "id" | "createdAt" | "updatedAt">): WardrobeProfile => {
    const newEntry: WardrobeProfile = {
      ...data,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    };
    setGlobalWardrobes((prev) => [newEntry, ...prev]);
    return newEntry;
  }, []);

  const updateGlobalWardrobe = useCallback((id: string, updates: Partial<WardrobeProfile>) => {
    setGlobalWardrobes((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates, id, createdAt: entry.createdAt, updatedAt: now() } : entry))
    );
  }, []);

  const deleteGlobalWardrobe = useCallback((id: string) => {
    setGlobalWardrobes((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const importLegacyToCloud = useCallback(
    async (options?: { overwriteConflicts?: boolean }) => {
      const legacyCharactersLocal = readStorage<CharacterProfile>(STORAGE_KEYS.characters);
      const legacyWardrobesLocal = readStorage<WardrobeProfile>(STORAGE_KEYS.wardrobes);

      if (!legacyCharactersLocal.length && !legacyWardrobesLocal.length) {
        writeFlag(STORAGE_KEYS.importFlag, true);
        setLegacyCharacters([]);
        setLegacyWardrobes([]);
        return;
      }

      const normalize = (value: string) => value.trim().toLowerCase();
      const overwriteConflicts = options?.overwriteConflicts ?? false;

      const mergeByName = <T extends { uiName: string }>(current: T[], legacy: T[]) => {
        const map = new Map(current.map((entry) => [normalize(entry.uiName), entry]));
        legacy.forEach((entry) => {
          const key = normalize(entry.uiName);
          if (!map.has(key) || overwriteConflicts) {
            map.set(key, entry);
          }
        });
        return Array.from(map.values());
      };

      const mergedCharacters = mergeByName(globalCharacters, legacyCharactersLocal);
      const mergedWardrobes = mergeByName(globalWardrobes, legacyWardrobesLocal);

      try {
        setIsSyncing(true);
        setSyncError(null);
        const [charResponse, wardrobeResponse] = await Promise.all([
          fetch("/api/global/characters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: mergedCharacters }),
          }),
          fetch("/api/global/wardrobes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: mergedWardrobes }),
          }),
        ]);
        const [charData, wardrobeData] = await Promise.all([charResponse.json(), wardrobeResponse.json()]);
        if (!charData.ok || !wardrobeData.ok) {
          throw new Error(charData.error?.message || wardrobeData.error?.message || "Failed to import legacy data");
        }

        skipSyncRef.current = { characters: true, wardrobes: true };
        setGlobalCharacters(mergedCharacters);
        setGlobalWardrobes(mergedWardrobes);
        writeFlag(STORAGE_KEYS.importFlag, true);
        localStorage.removeItem(STORAGE_KEYS.characters);
        localStorage.removeItem(STORAGE_KEYS.wardrobes);
        setLegacyCharacters([]);
        setLegacyWardrobes([]);
      } catch (error) {
        console.error("[GlobalLibrary] Failed to import legacy globals:", error);
        setSyncError(error instanceof Error ? error.message : "Failed to import legacy globals");
      } finally {
        setIsSyncing(false);
      }
    },
    [globalCharacters, globalWardrobes]
  );

  return {
    globalCharacters,
    globalWardrobes,
    storageMode,
    isSyncing,
    syncError,
    hasLegacyData,
    legacyConflictCount,
    importLegacyToCloud,
    addGlobalCharacter,
    updateGlobalCharacter,
    deleteGlobalCharacter,
    addGlobalWardrobe,
    updateGlobalWardrobe,
    deleteGlobalWardrobe,
    refreshGlobalLibrary,
  };
}

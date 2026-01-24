"use client";

import { useCallback, useEffect, useState } from "react";
import { CharacterProfile, WardrobeProfile } from "@/lib/schemas";

const STORAGE_KEYS = {
  characters: "pawsville_global_characters",
  wardrobes: "pawsville_global_wardrobes",
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

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export interface UseGlobalLibraryReturn {
  globalCharacters: CharacterProfile[];
  globalWardrobes: WardrobeProfile[];
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

  const refreshGlobalLibrary = useCallback(() => {
    setGlobalCharacters(readStorage<CharacterProfile>(STORAGE_KEYS.characters));
    setGlobalWardrobes(readStorage<WardrobeProfile>(STORAGE_KEYS.wardrobes));
  }, []);

  useEffect(() => {
    refreshGlobalLibrary();
  }, [refreshGlobalLibrary]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.characters, globalCharacters);
  }, [globalCharacters]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.wardrobes, globalWardrobes);
  }, [globalWardrobes]);

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

  return {
    globalCharacters,
    globalWardrobes,
    addGlobalCharacter,
    updateGlobalCharacter,
    deleteGlobalCharacter,
    addGlobalWardrobe,
    updateGlobalWardrobe,
    deleteGlobalWardrobe,
    refreshGlobalLibrary,
  };
}

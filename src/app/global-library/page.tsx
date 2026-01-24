"use client";

import { useMemo, useState } from "react";
import { CharacterProfile, WardrobeProfile } from "@/lib/schemas";
import { useGlobalLibrary } from "@/hooks/useGlobalLibrary";
import { useProject } from "@/hooks/useProject";
import { ManagerCard, ManagerHeader, EmptyState } from "@/components/manager-card";
import { Modal, ModalFooter } from "@/components/modal";

interface GlobalCharacterFormData {
  uiName: string;
  injectedText: string;
}

interface GlobalWardrobeFormData {
  uiName: string;
  outfitText: string;
  bansText: string;
}

const emptyCharacterForm: GlobalCharacterFormData = {
  uiName: "",
  injectedText: "",
};

const emptyWardrobeForm: GlobalWardrobeFormData = {
  uiName: "",
  outfitText: "",
  bansText: "",
};

export default function GlobalLibraryPage() {
  const {
    globalCharacters,
    globalWardrobes,
    addGlobalCharacter,
    updateGlobalCharacter,
    deleteGlobalCharacter,
    addGlobalWardrobe,
    updateGlobalWardrobe,
    deleteGlobalWardrobe,
  } = useGlobalLibrary();
  const { currentProject, addCharacter, addWardrobe } = useProject();

  const [characterSearch, setCharacterSearch] = useState("");
  const [wardrobeSearch, setWardrobeSearch] = useState("");

  const [characterModalOpen, setCharacterModalOpen] = useState(false);
  const [wardrobeModalOpen, setWardrobeModalOpen] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [editingWardrobeId, setEditingWardrobeId] = useState<string | null>(null);
  const [characterForm, setCharacterForm] = useState<GlobalCharacterFormData>(emptyCharacterForm);
  const [wardrobeForm, setWardrobeForm] = useState<GlobalWardrobeFormData>(emptyWardrobeForm);

  const filteredCharacters = useMemo(
    () =>
      globalCharacters.filter((entry) =>
        entry.uiName.toLowerCase().includes(characterSearch.trim().toLowerCase())
      ),
    [globalCharacters, characterSearch]
  );

  const filteredWardrobes = useMemo(
    () =>
      globalWardrobes.filter((entry) =>
        entry.uiName.toLowerCase().includes(wardrobeSearch.trim().toLowerCase())
      ),
    [globalWardrobes, wardrobeSearch]
  );

  const openCharacterModal = (entry?: CharacterProfile) => {
    if (entry) {
      setEditingCharacterId(entry.id);
      setCharacterForm({
        uiName: entry.uiName,
        injectedText: entry.injectedText,
      });
    } else {
      setEditingCharacterId(null);
      setCharacterForm(emptyCharacterForm);
    }
    setCharacterModalOpen(true);
  };

  const openWardrobeModal = (entry?: WardrobeProfile) => {
    if (entry) {
      setEditingWardrobeId(entry.id);
      setWardrobeForm({
        uiName: entry.uiName,
        outfitText: entry.outfitText,
        bansText: entry.bansText || "",
      });
    } else {
      setEditingWardrobeId(null);
      setWardrobeForm(emptyWardrobeForm);
    }
    setWardrobeModalOpen(true);
  };

  const handleCharacterSave = () => {
    if (!characterForm.uiName.trim() || !characterForm.injectedText.trim()) return;
    if (editingCharacterId) {
      updateGlobalCharacter(editingCharacterId, {
        uiName: characterForm.uiName.trim(),
        injectedText: characterForm.injectedText.trim(),
      });
    } else {
      addGlobalCharacter({
        uiName: characterForm.uiName.trim(),
        injectedText: characterForm.injectedText.trim(),
        helperFields: {},
      });
    }
    setCharacterModalOpen(false);
  };

  const handleWardrobeSave = () => {
    if (!wardrobeForm.uiName.trim() || !wardrobeForm.outfitText.trim()) return;
    const data = {
      uiName: wardrobeForm.uiName.trim(),
      outfitText: wardrobeForm.outfitText.trim(),
      bansText: wardrobeForm.bansText.trim() || undefined,
    };
    if (editingWardrobeId) {
      updateGlobalWardrobe(editingWardrobeId, data);
    } else {
      addGlobalWardrobe(data);
    }
    setWardrobeModalOpen(false);
  };

  const handleAddCharacterToProject = (entry: CharacterProfile) => {
    addCharacter({
      uiName: entry.uiName,
      injectedText: entry.injectedText,
      helperFields: entry.helperFields,
    });
  };

  const handleAddWardrobeToProject = (entry: WardrobeProfile) => {
    addWardrobe({
      uiName: entry.uiName,
      outfitText: entry.outfitText,
      bansText: entry.bansText,
    });
  };

  return (
    <div className="animate-fade-in space-y-10">
      <ManagerHeader
        title="Global Library"
        description={
          <>
            Reuse characters and wardrobes across any project. These entries are stored globally and can be imported into the current project.
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">GLOBAL</span>
          </>
        }
        icon="🌐"
        onAdd={() => openCharacterModal()}
        addLabel="Add Global Character"
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-canvas-800">Global Characters</h2>
          <div className="flex gap-2">
            <input
              type="text"
              className="input"
              placeholder="Search characters..."
              value={characterSearch}
              onChange={(e) => setCharacterSearch(e.target.value)}
            />
            <button className="btn btn-secondary" onClick={() => openCharacterModal()}>
              New
            </button>
          </div>
        </div>

        {filteredCharacters.length === 0 ? (
          <EmptyState
            icon="🧍"
            title="No global characters"
            description="Save a character to the global library to reuse it in any project."
            actionLabel="Add Global Character"
            onAction={() => openCharacterModal()}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCharacters.map((entry) => (
              <ManagerCard
                key={entry.id}
                title={entry.uiName}
                subtitle="Global character"
                onEdit={() => openCharacterModal(entry)}
                onDelete={() => deleteGlobalCharacter(entry.id)}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">GLOBAL</span>
                </div>
                <p className="line-clamp-3">{entry.injectedText}</p>
                <div className="mt-3">
                  <button
                    className="btn btn-primary text-xs"
                    onClick={() => handleAddCharacterToProject(entry)}
                    disabled={!currentProject}
                  >
                    {currentProject ? "Add to Current Project" : "Open a project to import"}
                  </button>
                </div>
              </ManagerCard>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-canvas-800">Global Wardrobes</h2>
          <div className="flex gap-2">
            <input
              type="text"
              className="input"
              placeholder="Search wardrobes..."
              value={wardrobeSearch}
              onChange={(e) => setWardrobeSearch(e.target.value)}
            />
            <button className="btn btn-secondary" onClick={() => openWardrobeModal()}>
              New
            </button>
          </div>
        </div>

        {filteredWardrobes.length === 0 ? (
          <EmptyState
            icon="👕"
            title="No global wardrobes"
            description="Save a wardrobe to the global library to reuse it in any project."
            actionLabel="Add Global Wardrobe"
            onAction={() => openWardrobeModal()}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredWardrobes.map((entry) => (
              <ManagerCard
                key={entry.id}
                title={entry.uiName}
                subtitle="Global wardrobe"
                onEdit={() => openWardrobeModal(entry)}
                onDelete={() => deleteGlobalWardrobe(entry.id)}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">GLOBAL</span>
                </div>
                <p className="line-clamp-3">{entry.outfitText}</p>
                {entry.bansText && (
                  <p className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                    Bans: {entry.bansText}
                  </p>
                )}
                <div className="mt-3">
                  <button
                    className="btn btn-primary text-xs"
                    onClick={() => handleAddWardrobeToProject(entry)}
                    disabled={!currentProject}
                  >
                    {currentProject ? "Add to Current Project" : "Open a project to import"}
                  </button>
                </div>
              </ManagerCard>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={characterModalOpen}
        onClose={() => setCharacterModalOpen(false)}
        title={editingCharacterId ? "Edit Global Character" : "Create Global Character"}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Character Name</label>
            <input
              type="text"
              className="input"
              value={characterForm.uiName}
              onChange={(e) => setCharacterForm({ ...characterForm, uiName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Identity Text</label>
            <textarea
              className="textarea min-h-[120px]"
              value={characterForm.injectedText}
              onChange={(e) => setCharacterForm({ ...characterForm, injectedText: e.target.value })}
            />
          </div>
        </div>
        <ModalFooter>
          <button onClick={() => setCharacterModalOpen(false)} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleCharacterSave}
            className="btn btn-primary"
            disabled={!characterForm.uiName.trim() || !characterForm.injectedText.trim()}
          >
            {editingCharacterId ? "Save Changes" : "Save Global Character"}
          </button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={wardrobeModalOpen}
        onClose={() => setWardrobeModalOpen(false)}
        title={editingWardrobeId ? "Edit Global Wardrobe" : "Create Global Wardrobe"}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Wardrobe Name</label>
            <input
              type="text"
              className="input"
              value={wardrobeForm.uiName}
              onChange={(e) => setWardrobeForm({ ...wardrobeForm, uiName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Outfit Description</label>
            <textarea
              className="textarea min-h-[120px]"
              value={wardrobeForm.outfitText}
              onChange={(e) => setWardrobeForm({ ...wardrobeForm, outfitText: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Clothing Bans (optional)</label>
            <input
              type="text"
              className="input"
              value={wardrobeForm.bansText}
              onChange={(e) => setWardrobeForm({ ...wardrobeForm, bansText: e.target.value })}
            />
          </div>
        </div>
        <ModalFooter>
          <button onClick={() => setWardrobeModalOpen(false)} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleWardrobeSave}
            className="btn btn-primary"
            disabled={!wardrobeForm.uiName.trim() || !wardrobeForm.outfitText.trim()}
          >
            {editingWardrobeId ? "Save Changes" : "Save Global Wardrobe"}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

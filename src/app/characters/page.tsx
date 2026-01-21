"use client";

import { useState, useEffect } from "react";
import { CharacterProfile } from "@/lib/schemas";
import {
  getCharacters,
  saveCharacter,
  updateCharacter,
  deleteCharacter,
  duplicateCharacter,
} from "@/lib/storage";
import { ManagerCard, ManagerHeader, EmptyState } from "@/components/manager-card";
import { Modal, ModalFooter } from "@/components/modal";

interface CharacterFormData {
  uiName: string;
  injectedText: string;
  helperFields?: {
    species?: string;
    anatomy?: string;
    face?: string;
    materials?: string;
    signatureTraits?: string;
    proportions?: string;
    sizeNotes?: string;
    bans?: string;
  };
}

const emptyForm: CharacterFormData = {
  uiName: "",
  injectedText: "",
  helperFields: {},
};

export default function CharactersPage() {
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CharacterFormData>(emptyForm);
  const [showHelpers, setShowHelpers] = useState(false);

  useEffect(() => {
    setCharacters(getCharacters());
  }, []);

  const refreshList = () => {
    setCharacters(getCharacters());
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowHelpers(false);
    setIsModalOpen(true);
  };

  const openEditModal = (character: CharacterProfile) => {
    setEditingId(character.id);
    setFormData({
      uiName: character.uiName,
      injectedText: character.injectedText,
      helperFields: character.helperFields || {},
    });
    setShowHelpers(!!character.helperFields && Object.values(character.helperFields).some(v => v));
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.uiName.trim() || !formData.injectedText.trim()) return;

    if (editingId) {
      updateCharacter(editingId, formData);
    } else {
      saveCharacter(formData);
    }
    refreshList();
    setIsModalOpen(false);
  };

  const handleDuplicate = (id: string) => {
    duplicateCharacter(id);
    refreshList();
  };

  const handleDelete = (id: string) => {
    deleteCharacter(id);
    refreshList();
  };

  const buildInjectedText = () => {
    if (!formData.helperFields) return;
    const parts: string[] = [];
    const h = formData.helperFields;
    if (h.species) parts.push(`Species: ${h.species}`);
    if (h.anatomy) parts.push(`Anatomy: ${h.anatomy}`);
    if (h.face) parts.push(`Face: ${h.face}`);
    if (h.materials) parts.push(`Materials: ${h.materials}`);
    if (h.signatureTraits) parts.push(`Signature traits: ${h.signatureTraits}`);
    if (h.proportions) parts.push(`Proportions: ${h.proportions}`);
    if (h.sizeNotes) parts.push(`Size: ${h.sizeNotes}`);
    if (h.bans) parts.push(`[BANS: ${h.bans}]`);
    
    if (parts.length > 0) {
      setFormData(prev => ({
        ...prev,
        injectedText: parts.join(". ") + "."
      }));
    }
  };

  return (
    <div className="animate-fade-in">
      <ManagerHeader
        title="Character Manager"
        description="Create and manage character identity profiles. These define WHO your characters are — species, anatomy, face, and distinctive traits. Outfits are managed separately in Wardrobes."
        icon="🦊"
        onAdd={openCreateModal}
        addLabel="Add Character"
      />

      {characters.length === 0 ? (
        <EmptyState
          icon="🦊"
          title="No characters yet"
          description="Create your first character identity profile to start building your cast."
          actionLabel="Create Character"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <ManagerCard
              key={character.id}
              title={character.uiName}
              subtitle={character.helperFields?.species}
              onEdit={() => openEditModal(character)}
              onDuplicate={() => handleDuplicate(character.id)}
              onDelete={() => handleDelete(character.id)}
            >
              <p className="line-clamp-3">{character.injectedText}</p>
            </ManagerCard>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Character" : "Create Character"}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="label">
              Character Name <span className="label-hint">(for UI display)</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Ember the Dragon"
              value={formData.uiName}
              onChange={(e) => setFormData({ ...formData, uiName: e.target.value })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Identity Text</label>
              <button
                type="button"
                onClick={() => setShowHelpers(!showHelpers)}
                className="text-sm text-paw-600 hover:text-paw-700"
              >
                {showHelpers ? "Hide" : "Show"} helper fields
              </button>
            </div>
            <textarea
              className="textarea min-h-[120px]"
              placeholder="Full identity description to inject into prompts..."
              value={formData.injectedText}
              onChange={(e) => setFormData({ ...formData, injectedText: e.target.value })}
            />
          </div>

          {showHelpers && (
            <div className="space-y-3 p-4 bg-canvas-50 rounded-xl border border-canvas-200">
              <p className="text-sm text-canvas-600 mb-3">
                Optional helper fields — fill these in and click "Build Text" to auto-generate the identity text.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label text-xs">Species/Type</label>
                  <input
                    type="text"
                    className="input py-2 text-sm"
                    placeholder="e.g., Red dragon"
                    value={formData.helperFields?.species || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      helperFields: { ...formData.helperFields, species: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Anatomy</label>
                  <input
                    type="text"
                    className="input py-2 text-sm"
                    placeholder="e.g., Bipedal, wings folded"
                    value={formData.helperFields?.anatomy || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      helperFields: { ...formData.helperFields, anatomy: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Face</label>
                  <input
                    type="text"
                    className="input py-2 text-sm"
                    placeholder="e.g., Sharp snout, golden eyes"
                    value={formData.helperFields?.face || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      helperFields: { ...formData.helperFields, face: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Materials</label>
                  <input
                    type="text"
                    className="input py-2 text-sm"
                    placeholder="e.g., Glossy crimson scales"
                    value={formData.helperFields?.materials || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      helperFields: { ...formData.helperFields, materials: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Signature Traits</label>
                  <input
                    type="text"
                    className="input py-2 text-sm"
                    placeholder="e.g., Scarred left horn"
                    value={formData.helperFields?.signatureTraits || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      helperFields: { ...formData.helperFields, signatureTraits: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Proportions</label>
                  <input
                    type="text"
                    className="input py-2 text-sm"
                    placeholder="e.g., Muscular, broad shoulders"
                    value={formData.helperFields?.proportions || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      helperFields: { ...formData.helperFields, proportions: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Size Notes</label>
                  <input
                    type="text"
                    className="input py-2 text-sm"
                    placeholder="e.g., 7ft tall"
                    value={formData.helperFields?.sizeNotes || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      helperFields: { ...formData.helperFields, sizeNotes: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Bans (what to avoid)</label>
                  <input
                    type="text"
                    className="input py-2 text-sm"
                    placeholder="e.g., No spikes on tail"
                    value={formData.helperFields?.bans || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      helperFields: { ...formData.helperFields, bans: e.target.value }
                    })}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={buildInjectedText}
                className="btn btn-secondary text-sm mt-2"
              >
                Build Text from Helpers
              </button>
            </div>
          )}
        </div>

        <ModalFooter>
          <button
            onClick={() => setIsModalOpen(false)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={!formData.uiName.trim() || !formData.injectedText.trim()}
          >
            {editingId ? "Save Changes" : "Create Character"}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

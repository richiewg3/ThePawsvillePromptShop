"use client";

import { useState } from "react";
import { WardrobeProfile } from "@/lib/schemas";
import { useProject } from "@/hooks/useProject";
import { ManagerCard, ManagerHeader, EmptyState } from "@/components/manager-card";
import { Modal, ModalFooter } from "@/components/modal";

interface WardrobeFormData {
  uiName: string;
  outfitText: string;
  bansText: string;
}

const emptyForm: WardrobeFormData = {
  uiName: "",
  outfitText: "",
  bansText: "",
};

export default function WardrobesPage() {
  // Use the project hook - ALL data comes from here (saved to Azure)
  const {
    currentProject,
    wardrobes,
    addWardrobe,
    updateWardrobe,
    deleteWardrobe,
    duplicateWardrobe,
    storageMode,
    isSaving,
  } = useProject();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WardrobeFormData>(emptyForm);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (wardrobe: WardrobeProfile) => {
    setEditingId(wardrobe.id);
    setFormData({
      uiName: wardrobe.uiName,
      outfitText: wardrobe.outfitText,
      bansText: wardrobe.bansText || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.uiName.trim() || !formData.outfitText.trim()) return;

    const data = {
      uiName: formData.uiName,
      outfitText: formData.outfitText,
      bansText: formData.bansText || undefined,
    };

    if (editingId) {
      updateWardrobe(editingId, data);
    } else {
      addWardrobe(data);
    }
    setIsModalOpen(false);
  };

  const handleDuplicate = (id: string) => {
    duplicateWardrobe(id);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this wardrobe?")) {
      deleteWardrobe(id);
    }
  };

  // Show message if no project is open
  if (!currentProject) {
    return (
      <div className="animate-fade-in">
        <ManagerHeader
          title="Wardrobe Manager"
          description="Create outfit profiles for your characters."
          icon="👔"
          onAdd={() => {}}
          addLabel="Add Wardrobe"
        />
        <div className="card p-8 text-center">
          <div className="text-6xl mb-4">📂</div>
          <h2 className="text-xl font-semibold text-canvas-800 mb-2">No Project Open</h2>
          <p className="text-canvas-600 mb-4">
            Wardrobes are saved within projects. Please open or create a project first from the home page.
          </p>
          <a href="/" className="btn btn-primary">
            Go to Projects
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <ManagerHeader
        title="Wardrobe Manager"
        description={
          <>
            Create outfit profiles for <strong>{currentProject.name}</strong>. 
            Each wardrobe is a complete outfit — when composing prompts, you'll bind one wardrobe to each character. 
            No variants inside a profile; create separate wardrobes for different outfits.
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
              storageMode === "azure" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
            }`}>
              {isSaving ? "Saving..." : (storageMode === "azure" ? "Cloud Synced" : "Local")}
            </span>
          </>
        }
        icon="👔"
        onAdd={openCreateModal}
        addLabel="Add Wardrobe"
      />

      {wardrobes.length === 0 ? (
        <EmptyState
          icon="👔"
          title="No wardrobes yet"
          description={`Create outfit profiles for "${currentProject.name}" that can be paired with any character.`}
          actionLabel="Create Wardrobe"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wardrobes.map((wardrobe) => (
            <ManagerCard
              key={wardrobe.id}
              title={wardrobe.uiName}
              subtitle={wardrobe.bansText ? "Has clothing bans" : undefined}
              onEdit={() => openEditModal(wardrobe)}
              onDuplicate={() => handleDuplicate(wardrobe.id)}
              onDelete={() => handleDelete(wardrobe.id)}
            >
              <p className="line-clamp-3">{wardrobe.outfitText}</p>
              {wardrobe.bansText && (
                <p className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  Bans: {wardrobe.bansText}
                </p>
              )}
            </ManagerCard>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Wardrobe" : "Create Wardrobe"}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">
              Outfit Name <span className="label-hint">(for UI display)</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Casual Sweater & Jeans"
              value={formData.uiName}
              onChange={(e) => setFormData({ ...formData, uiName: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Outfit Description</label>
            <textarea
              className="textarea"
              placeholder="Describe the complete outfit: tops, bottoms, footwear, accessories..."
              value={formData.outfitText}
              onChange={(e) => setFormData({ ...formData, outfitText: e.target.value })}
            />
            <p className="text-xs text-canvas-500 mt-1">
              This text will be injected into the prompt as the character's wardrobe lock.
            </p>
          </div>

          <div>
            <label className="label">
              Clothing Bans <span className="label-hint">(optional)</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g., No hats, no jewelry"
              value={formData.bansText}
              onChange={(e) => setFormData({ ...formData, bansText: e.target.value })}
            />
            <p className="text-xs text-canvas-500 mt-1">
              Items the generator should NOT add to this outfit.
            </p>
          </div>
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
            disabled={!formData.uiName.trim() || !formData.outfitText.trim()}
          >
            {editingId ? "Save Changes" : "Create Wardrobe"}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { WardrobeProfile } from "@/lib/schemas";
import {
  getWardrobes,
  saveWardrobe,
  updateWardrobe,
  deleteWardrobe,
  duplicateWardrobe,
} from "@/lib/storage";
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
  const [wardrobes, setWardrobes] = useState<WardrobeProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WardrobeFormData>(emptyForm);

  useEffect(() => {
    setWardrobes(getWardrobes());
  }, []);

  const refreshList = () => {
    setWardrobes(getWardrobes());
  };

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
      saveWardrobe(data);
    }
    refreshList();
    setIsModalOpen(false);
  };

  const handleDuplicate = (id: string) => {
    duplicateWardrobe(id);
    refreshList();
  };

  const handleDelete = (id: string) => {
    deleteWardrobe(id);
    refreshList();
  };

  return (
    <div className="animate-fade-in">
      <ManagerHeader
        title="Wardrobe Manager"
        description="Create outfit profiles for your characters. Each wardrobe is a complete outfit — when composing prompts, you'll bind one wardrobe to each character. No variants inside a profile; create separate wardrobes for different outfits."
        icon="👔"
        onAdd={openCreateModal}
        addLabel="Add Wardrobe"
      />

      {wardrobes.length === 0 ? (
        <EmptyState
          icon="👔"
          title="No wardrobes yet"
          description="Create outfit profiles that can be paired with any character during prompt composition."
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

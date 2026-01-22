"use client";

import { useState } from "react";
import { LensProfile, LensCategory } from "@/lib/schemas";
import { useProject } from "@/hooks/useProject";
import { ManagerCard, ManagerHeader, EmptyState } from "@/components/manager-card";
import { Modal, ModalFooter } from "@/components/modal";

interface LensFormData {
  uiName: string;
  focalLengthMm: string;
  category: LensCategory;
  injectedText: string;
}

const emptyForm: LensFormData = {
  uiName: "",
  focalLengthMm: "50",
  category: "normal",
  injectedText: "",
};

const FOCAL_OPTIONS = ["24", "35", "50", "85", "100", "135"] as const;
const CATEGORY_OPTIONS: { value: LensCategory; label: string }[] = [
  { value: "wide", label: "Wide" },
  { value: "normal", label: "Normal" },
  { value: "tele", label: "Telephoto" },
  { value: "macro", label: "Macro" },
];

const CATEGORY_COLORS: Record<LensCategory, string> = {
  wide: "bg-blue-100 text-blue-800",
  normal: "bg-green-100 text-green-800",
  tele: "bg-purple-100 text-purple-800",
  macro: "bg-amber-100 text-amber-800",
};

export default function LensesPage() {
  // Use the project hook - ALL data comes from here (saved to Azure)
  const {
    currentProject,
    lenses,
    addLens,
    updateLens,
    deleteLens,
    duplicateLens,
    storageMode,
    isSaving,
  } = useProject();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LensFormData>(emptyForm);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (lens: LensProfile) => {
    setEditingId(lens.id);
    setFormData({
      uiName: lens.uiName,
      focalLengthMm: lens.focalLengthMm,
      category: lens.category,
      injectedText: lens.injectedText,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.uiName.trim() || !formData.injectedText.trim()) return;

    const data = {
      uiName: formData.uiName,
      focalLengthMm: formData.focalLengthMm as LensProfile["focalLengthMm"],
      category: formData.category,
      injectedText: formData.injectedText,
    };

    if (editingId) {
      updateLens(editingId, data);
    } else {
      addLens(data);
    }
    setIsModalOpen(false);
  };

  const handleDuplicate = (id: string) => {
    duplicateLens(id);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this lens?")) {
      deleteLens(id);
    }
  };

  // Group lenses by category
  const lensesByCategory = lenses.reduce((acc, lens) => {
    if (!acc[lens.category]) acc[lens.category] = [];
    acc[lens.category].push(lens);
    return acc;
  }, {} as Record<LensCategory, LensProfile[]>);

  // Show message if no project is open
  if (!currentProject) {
    return (
      <div className="animate-fade-in">
        <ManagerHeader
          title="Lens Manager"
          description="Define optical characteristics for different focal lengths."
          icon="📷"
          onAdd={() => {}}
          addLabel="Add Lens"
        />
        <div className="card p-8 text-center">
          <div className="text-6xl mb-4">📂</div>
          <h2 className="text-xl font-semibold text-canvas-800 mb-2">No Project Open</h2>
          <p className="text-canvas-600 mb-4">
            Lenses are saved within projects. Please open or create a project first from the home page.
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
        title="Lens Manager"
        description={
          <>
            Define optical characteristics for <strong>{currentProject.name}</strong>. 
            Each lens profile describes how that focal length affects perspective, depth of field, and the overall feel of the image.
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
              storageMode === "azure" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
            }`}>
              {isSaving ? "Saving..." : (storageMode === "azure" ? "Cloud Synced" : "Local")}
            </span>
          </>
        }
        icon="📷"
        onAdd={openCreateModal}
        addLabel="Add Lens"
      />

      {lenses.length === 0 ? (
        <EmptyState
          icon="📷"
          title="No lenses yet"
          description="Create lens profiles to define how different focal lengths affect your images."
          actionLabel="Create Lens"
          onAction={openCreateModal}
        />
      ) : (
        <div className="space-y-8">
          {CATEGORY_OPTIONS.map(({ value: category, label }) => {
            const categoryLenses = lensesByCategory[category] || [];
            if (categoryLenses.length === 0) return null;
            
            return (
              <div key={category}>
                <h2 className="font-display text-lg font-semibold text-canvas-700 mb-3 flex items-center gap-2">
                  <span className={`badge ${CATEGORY_COLORS[category]}`}>{label}</span>
                  <span className="text-canvas-400 font-normal text-sm">
                    ({categoryLenses.length} {categoryLenses.length === 1 ? "lens" : "lenses"})
                  </span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryLenses.map((lens) => (
                    <ManagerCard
                      key={lens.id}
                      title={lens.uiName}
                      subtitle={`${lens.focalLengthMm}mm`}
                      onEdit={() => openEditModal(lens)}
                      onDuplicate={() => handleDuplicate(lens.id)}
                      onDelete={() => handleDelete(lens.id)}
                    >
                      <p className="line-clamp-3">{lens.injectedText}</p>
                    </ManagerCard>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Lens" : "Create Lens"}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Lens Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., 85mm Portrait"
              value={formData.uiName}
              onChange={(e) => setFormData({ ...formData, uiName: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Focal Length</label>
              <select
                className="select"
                value={formData.focalLengthMm}
                onChange={(e) => setFormData({ ...formData, focalLengthMm: e.target.value })}
              >
                {FOCAL_OPTIONS.map((focal) => (
                  <option key={focal} value={focal}>{focal}mm</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as LensCategory })}
              >
                {CATEGORY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Injected Text</label>
            <textarea
              className="textarea"
              placeholder="Describe the optical characteristics, perspective, and feel this lens produces..."
              value={formData.injectedText}
              onChange={(e) => setFormData({ ...formData, injectedText: e.target.value })}
            />
            <p className="text-xs text-canvas-500 mt-1">
              This text will be injected into the Camera/Optics section of the prompt.
            </p>
          </div>
        </div>

        <ModalFooter>
          <button onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={!formData.uiName.trim() || !formData.injectedText.trim()}
          >
            {editingId ? "Save Changes" : "Create Lens"}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

"use client";

import { useState } from "react";
import { MicroTexturePack, MicroDetailPack } from "@/lib/schemas";
import { useProject } from "@/hooks/useProject";
import { ManagerCard, ManagerHeader, EmptyState } from "@/components/manager-card";
import { Modal, ModalFooter } from "@/components/modal";

type PackType = "texture" | "detail";

interface PackFormData {
  type: PackType;
  uiName: string;
  items: string[];
}

const emptyForm: PackFormData = {
  type: "texture",
  uiName: "",
  items: [""],
};

export default function MicroPacksPage() {
  // Use the project hook - ALL data comes from here (saved to Azure)
  const {
    currentProject,
    microTextures,
    microDetails,
    addMicroTexture,
    addMicroDetail,
    updateMicroTexture,
    updateMicroDetail,
    deleteMicroTexture,
    deleteMicroDetail,
    duplicateMicroTexture,
    duplicateMicroDetail,
    storageMode,
    isSaving,
  } = useProject();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PackFormData>(emptyForm);
  const [activeTab, setActiveTab] = useState<PackType>("texture");

  const openCreateModal = (type: PackType) => {
    setEditingId(null);
    setFormData({ ...emptyForm, type });
    setIsModalOpen(true);
  };

  const openEditTextureModal = (pack: MicroTexturePack) => {
    setEditingId(pack.id);
    setFormData({
      type: "texture",
      uiName: pack.uiName,
      items: pack.items.length > 0 ? pack.items : [""],
    });
    setIsModalOpen(true);
  };

  const openEditDetailModal = (pack: MicroDetailPack) => {
    setEditingId(pack.id);
    setFormData({
      type: "detail",
      uiName: pack.uiName,
      items: pack.items.length > 0 ? pack.items : [""],
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.uiName.trim()) return;
    const filteredItems = formData.items.filter(item => item.trim());
    if (filteredItems.length === 0) return;

    const data = {
      uiName: formData.uiName,
      items: filteredItems,
    };

    if (formData.type === "texture") {
      if (editingId) {
        updateMicroTexture(editingId, data);
      } else {
        addMicroTexture(data);
      }
    } else {
      if (editingId) {
        updateMicroDetail(editingId, data);
      } else {
        addMicroDetail(data);
      }
    }
    setIsModalOpen(false);
  };

  const handleDuplicateTexture = (id: string) => {
    duplicateMicroTexture(id);
  };

  const handleDuplicateDetail = (id: string) => {
    duplicateMicroDetail(id);
  };

  const handleDeleteTexture = (id: string) => {
    if (confirm("Delete this texture pack?")) {
      deleteMicroTexture(id);
    }
  };

  const handleDeleteDetail = (id: string) => {
    if (confirm("Delete this detail pack?")) {
      deleteMicroDetail(id);
    }
  };

  const updateItem = (index: number, value: string) => {
    const updated = [...formData.items];
    updated[index] = value;
    setFormData({ ...formData, items: updated });
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, ""] });
  };

  const removeItem = (index: number) => {
    const updated = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updated.length > 0 ? updated : [""] });
  };

  // Show message if no project is open
  if (!currentProject) {
    return (
      <div className="animate-fade-in">
        <ManagerHeader
          title="Micro Packs Manager"
          description="Create packs of micro-textures and micro-details."
          icon="🔬"
          onAdd={() => {}}
          addLabel="Add Pack"
        />
        <div className="card p-8 text-center">
          <div className="text-6xl mb-4">📂</div>
          <h2 className="text-xl font-semibold text-canvas-800 mb-2">No Project Open</h2>
          <p className="text-canvas-600 mb-4">
            Micro Packs are saved within projects. Please open or create a project first from the home page.
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
        title="Micro Packs Manager"
        description={
          <>
            Create packs of micro-textures (surface details) and micro-details (environmental elements) for <strong>{currentProject.name}</strong>. 
            Select multiple packs during prompt composition to add rich detail to your scenes.
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
              storageMode === "azure" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
            }`}>
              {isSaving ? "Saving..." : (storageMode === "azure" ? "Cloud Synced" : "Local")}
            </span>
          </>
        }
        icon="🔬"
        onAdd={() => openCreateModal(activeTab)}
        addLabel={`Add ${activeTab === "texture" ? "Texture" : "Detail"} Pack`}
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("texture")}
          className={`btn ${activeTab === "texture" ? "btn-primary" : "btn-secondary"}`}
        >
          🧵 Micro-Textures ({microTextures.length})
        </button>
        <button
          onClick={() => setActiveTab("detail")}
          className={`btn ${activeTab === "detail" ? "btn-primary" : "btn-secondary"}`}
        >
          ✨ Micro-Details ({microDetails.length})
        </button>
      </div>

      {/* Texture Packs Tab */}
      {activeTab === "texture" && (
        <>
          {microTextures.length === 0 ? (
            <EmptyState
              icon="🧵"
              title="No texture packs yet"
              description="Create packs of micro-textures like fur details, fabric weaves, and surface materials."
              actionLabel="Create Texture Pack"
              onAction={() => openCreateModal("texture")}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {microTextures.map((pack) => (
                <ManagerCard
                  key={pack.id}
                  title={pack.uiName}
                  subtitle={`${pack.items.length} items`}
                  onEdit={() => openEditTextureModal(pack)}
                  onDuplicate={() => handleDuplicateTexture(pack.id)}
                  onDelete={() => handleDeleteTexture(pack.id)}
                >
                  <ul className="list-disc list-inside space-y-0.5">
                    {pack.items.slice(0, 3).map((item, i) => (
                      <li key={i} className="truncate">{item}</li>
                    ))}
                    {pack.items.length > 3 && (
                      <li className="text-canvas-400">+{pack.items.length - 3} more...</li>
                    )}
                  </ul>
                </ManagerCard>
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail Packs Tab */}
      {activeTab === "detail" && (
        <>
          {microDetails.length === 0 ? (
            <EmptyState
              icon="✨"
              title="No detail packs yet"
              description="Create packs of micro-details like atmospheric effects, wear patterns, and environmental clutter."
              actionLabel="Create Detail Pack"
              onAction={() => openCreateModal("detail")}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {microDetails.map((pack) => (
                <ManagerCard
                  key={pack.id}
                  title={pack.uiName}
                  subtitle={`${pack.items.length} items`}
                  onEdit={() => openEditDetailModal(pack)}
                  onDuplicate={() => handleDuplicateDetail(pack.id)}
                  onDelete={() => handleDeleteDetail(pack.id)}
                >
                  <ul className="list-disc list-inside space-y-0.5">
                    {pack.items.slice(0, 3).map((item, i) => (
                      <li key={i} className="truncate">{item}</li>
                    ))}
                    {pack.items.length > 3 && (
                      <li className="text-canvas-400">+{pack.items.length - 3} more...</li>
                    )}
                  </ul>
                </ManagerCard>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId 
          ? `Edit ${formData.type === "texture" ? "Texture" : "Detail"} Pack`
          : `Create ${formData.type === "texture" ? "Texture" : "Detail"} Pack`
        }
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Pack Name</label>
            <input
              type="text"
              className="input"
              placeholder={formData.type === "texture" 
                ? "e.g., Fur & Feather" 
                : "e.g., Atmospheric Effects"
              }
              value={formData.uiName}
              onChange={(e) => setFormData({ ...formData, uiName: e.target.value })}
            />
          </div>

          <div>
            <label className="label">
              {formData.type === "texture" ? "Texture Items" : "Detail Items"}
            </label>
            <p className="text-xs text-canvas-500 mb-3">
              {formData.type === "texture"
                ? "Surface-level material details like fur strands, fabric weave, metal scratches."
                : "Environmental and atmospheric elements like dust motes, wear marks, light effects."
              }
            </p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder={formData.type === "texture"
                      ? "e.g., individual fur strands with natural variation"
                      : "e.g., visible dust motes floating in light beams"
                    }
                    value={item}
                    onChange={(e) => updateItem(index, e.target.value)}
                  />
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="btn-ghost p-2 text-red-500 flex-shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="btn btn-secondary text-sm mt-3"
            >
              + Add Item
            </button>
          </div>
        </div>

        <ModalFooter>
          <button onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={!formData.uiName.trim() || !formData.items.some(i => i.trim())}
          >
            {editingId ? "Save Changes" : "Create Pack"}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

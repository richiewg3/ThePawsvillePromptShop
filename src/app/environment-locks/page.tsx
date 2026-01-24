"use client";

import { useMemo, useState } from "react";
import { EnvironmentPreset, StageAnchor } from "@/lib/schemas";
import { useProject } from "@/hooks/useProject";
import { ManagerCard, ManagerHeader, EmptyState } from "@/components/manager-card";
import { Modal, ModalFooter } from "@/components/modal";

interface EnvironmentFormData {
  uiName: string;
  sceneDescription: string;
  stageAnchors: StageAnchor[];
  spatialLayoutNotes: string;
  lightingNotes: string;
  colorPaletteNotes: string;
  cameraViewNotes: string;
  doNotChangeConstraints: string;
}

const emptyAnchor: StageAnchor = {
  name: "",
  position: "",
  materialTexture: "",
  uniqueDetail: "",
};

const emptyForm: EnvironmentFormData = {
  uiName: "",
  sceneDescription: "",
  stageAnchors: [{ ...emptyAnchor }, { ...emptyAnchor }, { ...emptyAnchor }],
  spatialLayoutNotes: "",
  lightingNotes: "",
  colorPaletteNotes: "",
  cameraViewNotes: "",
  doNotChangeConstraints: "",
};

export default function EnvironmentLocksPage() {
  const {
    currentProject,
    environmentPresets,
    activeEnvironmentPresetId,
    addEnvironmentPreset,
    updateEnvironmentPreset,
    deleteEnvironmentPreset,
    duplicateEnvironmentPreset,
    setActiveEnvironmentPreset,
    storageMode,
    isSaving,
  } = useProject();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EnvironmentFormData>(emptyForm);

  const activePreset = useMemo(
    () => environmentPresets.find((preset) => preset.id === activeEnvironmentPresetId) || null,
    [environmentPresets, activeEnvironmentPresetId]
  );

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (preset: EnvironmentPreset) => {
    setEditingId(preset.id);
    setFormData({
      uiName: preset.uiName,
      sceneDescription: preset.sceneDescription,
      stageAnchors: preset.stageAnchors.length ? preset.stageAnchors : [{ ...emptyAnchor }, { ...emptyAnchor }, { ...emptyAnchor }],
      spatialLayoutNotes: preset.spatialLayoutNotes,
      lightingNotes: preset.lightingNotes,
      colorPaletteNotes: preset.colorPaletteNotes,
      cameraViewNotes: preset.cameraViewNotes,
      doNotChangeConstraints: preset.doNotChangeConstraints.join("\n"),
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    const trimmedAnchors = formData.stageAnchors
      .map((anchor) => ({
        name: anchor.name.trim(),
        position: anchor.position.trim(),
        materialTexture: anchor.materialTexture.trim(),
        uniqueDetail: anchor.uniqueDetail.trim(),
      }))
      .filter((anchor) => anchor.name && anchor.position && anchor.materialTexture && anchor.uniqueDetail);

    if (!formData.uiName.trim() || !formData.sceneDescription.trim() || trimmedAnchors.length < 3) {
      return;
    }

    const data = {
      uiName: formData.uiName.trim(),
      sceneDescription: formData.sceneDescription.trim(),
      stageAnchors: trimmedAnchors,
      spatialLayoutNotes: formData.spatialLayoutNotes.trim(),
      lightingNotes: formData.lightingNotes.trim(),
      colorPaletteNotes: formData.colorPaletteNotes.trim(),
      cameraViewNotes: formData.cameraViewNotes.trim(),
      doNotChangeConstraints: formData.doNotChangeConstraints
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };

    if (editingId) {
      updateEnvironmentPreset(editingId, data);
    } else {
      addEnvironmentPreset(data);
    }
    setIsModalOpen(false);
  };

  const handleDuplicate = (id: string) => {
    duplicateEnvironmentPreset(id);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this environment preset?")) {
      deleteEnvironmentPreset(id);
    }
  };

  const updateAnchor = (index: number, updates: Partial<StageAnchor>) => {
    setFormData((prev) => {
      const anchors = prev.stageAnchors.map((anchor, idx) => (idx === index ? { ...anchor, ...updates } : anchor));
      return { ...prev, stageAnchors: anchors };
    });
  };

  const addAnchor = () => {
    setFormData((prev) => {
      if (prev.stageAnchors.length >= 5) return prev;
      return { ...prev, stageAnchors: [...prev.stageAnchors, { ...emptyAnchor }] };
    });
  };

  const removeAnchor = (index: number) => {
    setFormData((prev) => {
      if (prev.stageAnchors.length <= 3) return prev;
      return { ...prev, stageAnchors: prev.stageAnchors.filter((_, idx) => idx !== index) };
    });
  };

  // Show message if no project is open
  if (!currentProject) {
    return (
      <div className="animate-fade-in">
        <ManagerHeader
          title="Environment Lock"
          description="Save consistent environment presets for your projects."
          icon="🌿"
          onAdd={() => {}}
          addLabel="Add Environment Preset"
        />
        <div className="card p-8 text-center">
          <div className="text-6xl mb-4">📂</div>
          <h2 className="text-xl font-semibold text-canvas-800 mb-2">No Project Open</h2>
          <p className="text-canvas-600 mb-4">
            Environment locks are saved within projects. Please open or create a project first from the home page.
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
        title="Environment Lock"
        description={
          <>
            Build scene presets for <strong>{currentProject.name}</strong> and lock one as the active environment for consistent prompts.
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-canvas-100 text-canvas-600">PROJECT</span>
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
              storageMode === "azure" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
            }`}>
              {isSaving ? "Saving..." : (storageMode === "azure" ? "Cloud Synced" : "Local")}
            </span>
          </>
        }
        icon="🌿"
        onAdd={openCreateModal}
        addLabel="Add Environment Preset"
      />

      {activePreset && (
        <div className="mb-6 p-4 rounded-xl border border-paw-200 bg-paw-50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-paw-700">Active Environment Lock:</span>
            <span className="text-sm text-paw-700">{activePreset.uiName}</span>
          </div>
        </div>
      )}

      {environmentPresets.length === 0 ? (
        <EmptyState
          icon="🌿"
          title="No environment presets yet"
          description={`Create your first environment lock for "${currentProject.name}".`}
          actionLabel="Create Environment Preset"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {environmentPresets.map((preset) => {
            const isActive = preset.id === activeEnvironmentPresetId;
            return (
              <ManagerCard
                key={preset.id}
                title={preset.uiName}
                subtitle={`${preset.stageAnchors.length} anchors`}
                onEdit={() => openEditModal(preset)}
                onDuplicate={() => handleDuplicate(preset.id)}
                onDelete={() => handleDelete(preset.id)}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-canvas-100 text-canvas-600">PROJECT</span>
                  {isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-paw-100 text-paw-700">ACTIVE LOCK</span>
                  )}
                </div>
                <p className="line-clamp-3">{preset.sceneDescription}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveEnvironmentPreset(preset.id)}
                    className={`btn ${isActive ? "btn-secondary" : "btn-primary"} text-xs`}
                    disabled={isActive}
                  >
                    {isActive ? "Active Lock" : "Set as Active Lock"}
                  </button>
                </div>
              </ManagerCard>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Environment Preset" : "Create Environment Preset"}
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="label">
              Preset Name <span className="label-hint">(for UI display)</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Cozy Library Interior"
              value={formData.uiName}
              onChange={(e) => setFormData({ ...formData, uiName: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Scene Description</label>
            <textarea
              className="textarea min-h-[120px]"
              placeholder="Describe the environment scene in detail..."
              value={formData.sceneDescription}
              onChange={(e) => setFormData({ ...formData, sceneDescription: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="label mb-0">Stage Anchors (3–5)</label>
              <button
                type="button"
                onClick={addAnchor}
                className="btn btn-secondary text-xs"
                disabled={formData.stageAnchors.length >= 5}
              >
                Add Anchor
              </button>
            </div>
            <div className="space-y-3">
              {formData.stageAnchors.map((anchor, index) => (
                <div key={`anchor-${index}`} className="p-3 rounded-lg border border-canvas-200 bg-canvas-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-canvas-700">Anchor {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeAnchor(index)}
                      className="text-xs text-red-600 hover:text-red-700"
                      disabled={formData.stageAnchors.length <= 3}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="label text-xs">Name</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Anchor name"
                        value={anchor.name}
                        onChange={(e) => updateAnchor(index, { name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Position</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g., foreground left"
                        value={anchor.position}
                        onChange={(e) => updateAnchor(index, { position: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Material / Texture</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g., worn oak, velvet"
                        value={anchor.materialTexture}
                        onChange={(e) => updateAnchor(index, { materialTexture: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Unique Detail</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g., brass inset carvings"
                        value={anchor.uniqueDetail}
                        onChange={(e) => updateAnchor(index, { uniqueDetail: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Spatial Layout Notes</label>
            <textarea
              className="textarea"
              placeholder="Foreground/midground/background, left/right notes..."
              value={formData.spatialLayoutNotes}
              onChange={(e) => setFormData({ ...formData, spatialLayoutNotes: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Lighting Notes</label>
            <textarea
              className="textarea"
              placeholder="Describe the lighting setup..."
              value={formData.lightingNotes}
              onChange={(e) => setFormData({ ...formData, lightingNotes: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Color Palette / Grade Notes</label>
            <textarea
              className="textarea"
              placeholder="Describe the color palette or grading..."
              value={formData.colorPaletteNotes}
              onChange={(e) => setFormData({ ...formData, colorPaletteNotes: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Camera / View Notes</label>
            <textarea
              className="textarea"
              placeholder="Describe the camera viewpoint, height, or framing..."
              value={formData.cameraViewNotes}
              onChange={(e) => setFormData({ ...formData, cameraViewNotes: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Environment “Do Not Change” Constraints</label>
            <textarea
              className="textarea"
              placeholder="Add short bullet notes, one per line..."
              value={formData.doNotChangeConstraints}
              onChange={(e) => setFormData({ ...formData, doNotChangeConstraints: e.target.value })}
            />
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
            disabled={
              !formData.uiName.trim() ||
              !formData.sceneDescription.trim() ||
              formData.stageAnchors.filter((anchor) =>
                anchor.name.trim() && anchor.position.trim() && anchor.materialTexture.trim() && anchor.uniqueDetail.trim()
              ).length < 3 ||
              !formData.spatialLayoutNotes.trim() ||
              !formData.lightingNotes.trim() ||
              !formData.colorPaletteNotes.trim() ||
              !formData.cameraViewNotes.trim()
            }
          >
            {editingId ? "Save Changes" : "Save Environment Preset"}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

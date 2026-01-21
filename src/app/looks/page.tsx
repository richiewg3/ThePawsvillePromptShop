"use client";

import { useState, useEffect } from "react";
import { LookFamily, Framing } from "@/lib/schemas";
import { getLooks, saveLook, updateLook, deleteLook, duplicateLook } from "@/lib/storage";
import { ManagerCard, ManagerHeader, EmptyState } from "@/components/manager-card";
import { Modal, ModalFooter } from "@/components/modal";

interface LookFormData {
  uiName: string;
  injectedText: string;
  whenToUse: string;
  producesSummary: string[];
  exampleUseCase: string;
  opticsBiasNotes: string;
  recommendedLensByFraming: {
    face_emotion: string;
    medium: string;
    full_body: string;
    wide_scene: string;
  };
}

const emptyForm: LookFormData = {
  uiName: "",
  injectedText: "",
  whenToUse: "",
  producesSummary: [""],
  exampleUseCase: "",
  opticsBiasNotes: "",
  recommendedLensByFraming: {
    face_emotion: "85",
    medium: "50",
    full_body: "35",
    wide_scene: "24",
  },
};

const FOCAL_OPTIONS = ["24", "35", "50", "85", "100", "135"] as const;
const FRAMING_LABELS: Record<Framing, string> = {
  face_emotion: "Face/Emotion",
  medium: "Medium (Waist-up)",
  full_body: "Full Body",
  wide_scene: "Wide Scene",
};

export default function LooksPage() {
  const [looks, setLooks] = useState<LookFamily[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LookFormData>(emptyForm);

  useEffect(() => {
    setLooks(getLooks());
  }, []);

  const refreshList = () => {
    setLooks(getLooks());
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (look: LookFamily) => {
    setEditingId(look.id);
    setFormData({
      uiName: look.uiName,
      injectedText: look.injectedText,
      whenToUse: look.whenToUse,
      producesSummary: look.producesSummary.length > 0 ? look.producesSummary : [""],
      exampleUseCase: look.exampleUseCase || "",
      opticsBiasNotes: look.opticsBiasNotes || "",
      recommendedLensByFraming: look.recommendedLensByFraming,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.uiName.trim() || !formData.injectedText.trim() || !formData.whenToUse.trim()) return;

    const data = {
      uiName: formData.uiName,
      injectedText: formData.injectedText,
      whenToUse: formData.whenToUse,
      producesSummary: formData.producesSummary.filter(s => s.trim()),
      exampleUseCase: formData.exampleUseCase || undefined,
      opticsBiasNotes: formData.opticsBiasNotes || undefined,
      recommendedLensByFraming: formData.recommendedLensByFraming as LookFamily["recommendedLensByFraming"],
    };

    if (editingId) {
      updateLook(editingId, data);
    } else {
      saveLook(data);
    }
    refreshList();
    setIsModalOpen(false);
  };

  const handleDuplicate = (id: string) => {
    duplicateLook(id);
    refreshList();
  };

  const handleDelete = (id: string) => {
    deleteLook(id);
    refreshList();
  };

  const updateProducesSummary = (index: number, value: string) => {
    const updated = [...formData.producesSummary];
    updated[index] = value;
    setFormData({ ...formData, producesSummary: updated });
  };

  const addProducesSummaryItem = () => {
    setFormData({ ...formData, producesSummary: [...formData.producesSummary, ""] });
  };

  const removeProducesSummaryItem = (index: number) => {
    const updated = formData.producesSummary.filter((_, i) => i !== index);
    setFormData({ ...formData, producesSummary: updated.length > 0 ? updated : [""] });
  };

  return (
    <div className="animate-fade-in">
      <ManagerHeader
        title="Look Manager"
        description="Define lighting, color grade, and finish combinations. Each Look includes recommended lens mappings per framing — when using 'Auto' lens mode, the Prompt Composer will automatically select the appropriate lens."
        icon="🎨"
        onAdd={openCreateModal}
        addLabel="Add Look"
      />

      {looks.length === 0 ? (
        <EmptyState
          icon="🎨"
          title="No looks yet"
          description="Looks define lighting moods, color grades, and finish styles for your scenes."
          actionLabel="Create Look"
          onAction={openCreateModal}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {looks.map((look) => (
            <ManagerCard
              key={look.id}
              title={look.uiName}
              subtitle={look.whenToUse}
              onEdit={() => openEditModal(look)}
              onDuplicate={() => handleDuplicate(look.id)}
              onDelete={() => handleDelete(look.id)}
            >
              <p className="line-clamp-2 mb-2">{look.injectedText}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {look.producesSummary.slice(0, 3).map((item, i) => (
                  <span key={i} className="badge badge-paw text-xs">
                    {item}
                  </span>
                ))}
                {look.producesSummary.length > 3 && (
                  <span className="badge badge-paw text-xs">
                    +{look.producesSummary.length - 3} more
                  </span>
                )}
              </div>
            </ManagerCard>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Look" : "Create Look"}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Look Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Cozy Chiaroscuro Interior"
                value={formData.uiName}
                onChange={(e) => setFormData({ ...formData, uiName: e.target.value })}
              />
            </div>
            <div>
              <label className="label">When to Use</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Dramatic mood with shadows"
                value={formData.whenToUse}
                onChange={(e) => setFormData({ ...formData, whenToUse: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Injected Text (Lighting + Grade + Finish)</label>
            <textarea
              className="textarea min-h-[100px]"
              placeholder="Full description of lighting, color grade, and finish to inject into prompts..."
              value={formData.injectedText}
              onChange={(e) => setFormData({ ...formData, injectedText: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Produces Summary (UI tags)</label>
            <div className="space-y-2">
              {formData.producesSummary.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder="e.g., Deep shadows with golden highlights"
                    value={item}
                    onChange={(e) => updateProducesSummary(index, e.target.value)}
                  />
                  {formData.producesSummary.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProducesSummaryItem(index)}
                      className="btn-ghost p-2 text-red-500"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addProducesSummaryItem}
                className="btn btn-secondary text-sm"
              >
                + Add Summary Item
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Example Use Case (optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Character reading by firelight"
                value={formData.exampleUseCase}
                onChange={(e) => setFormData({ ...formData, exampleUseCase: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Optics Bias Notes (optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., 135mm optional for extra isolation"
                value={formData.opticsBiasNotes}
                onChange={(e) => setFormData({ ...formData, opticsBiasNotes: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Recommended Lens by Framing (Auto mode)</label>
            <p className="text-xs text-canvas-500 mb-3">
              When Prompt Composer uses "Auto" lens mode, it will select these focal lengths based on the chosen framing.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(Object.keys(FRAMING_LABELS) as Framing[]).map((framing) => (
                <div key={framing}>
                  <label className="label text-xs">{FRAMING_LABELS[framing]}</label>
                  <select
                    className="select"
                    value={formData.recommendedLensByFraming[framing]}
                    onChange={(e) => setFormData({
                      ...formData,
                      recommendedLensByFraming: {
                        ...formData.recommendedLensByFraming,
                        [framing]: e.target.value
                      }
                    })}
                  >
                    {FOCAL_OPTIONS.map((focal) => (
                      <option key={focal} value={focal}>{focal}mm</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ModalFooter>
          <button onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={!formData.uiName.trim() || !formData.injectedText.trim() || !formData.whenToUse.trim()}
          >
            {editingId ? "Save Changes" : "Create Look"}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

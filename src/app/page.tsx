"use client";

import { useState, useEffect, useMemo } from "react";
import {
  PromptRequest,
  CharacterProfile,
  WardrobeProfile,
  LookFamily,
  LensProfile,
  MicroTexturePack,
  MicroDetailPack,
  CastMember,
  AspectRatio,
  OutputMode,
  Framing,
  LensMode,
  validatePromptRequest,
} from "@/lib/schemas";
import {
  getCharacters,
  getWardrobes,
  getLooks,
  getLenses,
  getMicroTextures,
  getMicroDetails,
  getCurrentDraft,
  saveCurrentDraft,
  downloadJson,
  exportPromptRequest,
  importData,
} from "@/lib/storage";
import { compilePrompt, CompilerContext } from "@/lib/compiler";
import { CastWardrobeBinder } from "@/components/cast-wardrobe-binder";
import { AnchorFields } from "@/components/anchor-fields";
import { MicroPackSelectors } from "@/components/micro-pack-selectors";
import { ValidationPanel } from "@/components/validation-panel";
import { PromptPreview } from "@/components/prompt-preview";
import { LookInfoPopover } from "@/components/look-info-popover";
import { AISuggestionModal, AnchorSuggestionModal } from "@/components/ai-suggestion-modal";
import {
  suggestAnchors,
  suggestMechanicLock,
  suggestFocusTarget,
  runQACheck,
} from "@/lib/ai-client";

const ASPECT_RATIO_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: "1x1", label: "1:1 Square" },
  { value: "2x3", label: "2:3 Portrait" },
  { value: "3x2", label: "3:2 Landscape" },
];

const OUTPUT_MODE_OPTIONS: { value: OutputMode; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "expanded", label: "Expanded (5-Star)" },
];

const FRAMING_OPTIONS: { value: Framing; label: string; desc: string }[] = [
  { value: "face_emotion", label: "Face/Emotion", desc: "Tight close-up on face" },
  { value: "medium", label: "Medium", desc: "Waist-up framing" },
  { value: "full_body", label: "Full Body", desc: "Head-to-toe, no cropping" },
  { value: "wide_scene", label: "Wide Scene", desc: "Full environment visible" },
];

export default function PromptComposerPage() {
  // Library data
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [wardrobes, setWardrobes] = useState<WardrobeProfile[]>([]);
  const [looks, setLooks] = useState<LookFamily[]>([]);
  const [lenses, setLenses] = useState<LensProfile[]>([]);
  const [microTextures, setMicroTextures] = useState<MicroTexturePack[]>([]);
  const [microDetails, setMicroDetails] = useState<MicroDetailPack[]>([]);

  // Form state
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("3x2");
  const [outputMode, setOutputMode] = useState<OutputMode>("compact");
  const [sceneHeart, setSceneHeart] = useState("");
  const [cast, setCast] = useState<CastMember[]>([]);
  const [framing, setFraming] = useState<Framing>("medium");
  const [lensMode, setLensMode] = useState<LensMode>("auto");
  const [lensProfileId, setLensProfileId] = useState<string>("");
  const [lookFamilyId, setLookFamilyId] = useState<string>("");
  const [environmentAnchors, setEnvironmentAnchors] = useState<string[]>(["", "", "", "", ""]);
  const [mechanicLock, setMechanicLock] = useState("");
  const [focusTarget, setFocusTarget] = useState("");
  const [selectedMicroTextures, setSelectedMicroTextures] = useState<string[]>([]);
  const [selectedMicroDetails, setSelectedMicroDetails] = useState<string[]>([]);

  // AI suggestion state
  const [anchorModalOpen, setAnchorModalOpen] = useState(false);
  const [anchorSuggestions, setAnchorSuggestions] = useState<{ candidates: string[]; recommended: string[] }>({ candidates: [], recommended: [] });
  const [anchorLoading, setAnchorLoading] = useState(false);
  const [anchorError, setAnchorError] = useState<string | null>(null);

  const [mechanicModalOpen, setMechanicModalOpen] = useState(false);
  const [mechanicSuggestions, setMechanicSuggestions] = useState<string[]>([]);
  const [mechanicLoading, setMechanicLoading] = useState(false);
  const [mechanicError, setMechanicError] = useState<string | null>(null);

  const [focusModalOpen, setFocusModalOpen] = useState(false);
  const [focusSuggestions, setFocusSuggestions] = useState<string[]>([]);
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusError, setFocusError] = useState<string | null>(null);

  const [qaLoading, setQaLoading] = useState(false);
  const [qaResults, setQaResults] = useState<{ warnings: string[]; suggestedFixes: string[] } | null>(null);

  // Load library data
  useEffect(() => {
    setCharacters(getCharacters());
    setWardrobes(getWardrobes());
    setLooks(getLooks());
    setLenses(getLenses());
    setMicroTextures(getMicroTextures());
    setMicroDetails(getMicroDetails());

    // Load draft if exists
    const draft = getCurrentDraft();
    if (draft) {
      if (draft.aspectRatio) setAspectRatio(draft.aspectRatio);
      if (draft.outputMode) setOutputMode(draft.outputMode);
      if (draft.sceneHeart) setSceneHeart(draft.sceneHeart);
      if (draft.cast) setCast(draft.cast);
      if (draft.framing) setFraming(draft.framing);
      if (draft.lensMode) setLensMode(draft.lensMode);
      if (draft.lensProfileId) setLensProfileId(draft.lensProfileId);
      if (draft.lookFamilyId) setLookFamilyId(draft.lookFamilyId);
      if (draft.environmentAnchors) setEnvironmentAnchors(draft.environmentAnchors);
      if (draft.mechanicLock) setMechanicLock(draft.mechanicLock);
      if (draft.focusTarget) setFocusTarget(draft.focusTarget);
      if (draft.selectedMicroTextures) setSelectedMicroTextures(draft.selectedMicroTextures);
      if (draft.selectedMicroDetails) setSelectedMicroDetails(draft.selectedMicroDetails);
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    const draft: Partial<PromptRequest> = {
      aspectRatio,
      outputMode,
      sceneHeart,
      cast,
      framing,
      lensMode,
      lensProfileId: lensProfileId || undefined,
      lookFamilyId: lookFamilyId || undefined,
      environmentAnchors,
      mechanicLock,
      focusTarget,
      selectedMicroTextures,
      selectedMicroDetails,
    };
    saveCurrentDraft(draft);
  }, [
    aspectRatio,
    outputMode,
    sceneHeart,
    cast,
    framing,
    lensMode,
    lensProfileId,
    lookFamilyId,
    environmentAnchors,
    mechanicLock,
    focusTarget,
    selectedMicroTextures,
    selectedMicroDetails,
  ]);

  // Build full request for validation/compilation
  const promptRequest: Partial<PromptRequest> = useMemo(
    () => ({
      id: crypto.randomUUID(),
      aspectRatio,
      outputMode,
      sceneHeart,
      cast,
      framing,
      lensMode,
      lensProfileId: lensMode === "manual" ? lensProfileId : undefined,
      lookFamilyId,
      environmentAnchors: environmentAnchors.filter((a) => a.trim()),
      mechanicLock,
      focusTarget,
      selectedMicroTextures,
      selectedMicroDetails,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [
      aspectRatio,
      outputMode,
      sceneHeart,
      cast,
      framing,
      lensMode,
      lensProfileId,
      lookFamilyId,
      environmentAnchors,
      mechanicLock,
      focusTarget,
      selectedMicroTextures,
      selectedMicroDetails,
    ]
  );

  // Validation
  const validationErrors = useMemo(
    () => validatePromptRequest(promptRequest, characters, wardrobes, looks, lenses),
    [promptRequest, characters, wardrobes, looks, lenses]
  );

  const hardErrors = validationErrors.filter((e) => e.type === "hard");
  const canCompile = hardErrors.length === 0;

  // Compilation
  const compiledResult = useMemo(() => {
    if (!canCompile) return null;
    const context: CompilerContext = {
      characters,
      wardrobes,
      looks,
      lenses,
      microTextures,
      microDetails,
    };
    return compilePrompt(promptRequest as PromptRequest, context);
  }, [canCompile, promptRequest, characters, wardrobes, looks, lenses, microTextures, microDetails]);

  // Selected look for info display
  const selectedLook = looks.find((l) => l.id === lookFamilyId) || null;

  // Export/Import handlers
  const handleExport = () => {
    const data = exportPromptRequest();
    downloadJson(data, `pawsville-prompt-${Date.now()}.json`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const result = importData(data);
        if (result.errors.length > 0) {
          alert(`Import completed with errors:\n${result.errors.join("\n")}`);
        } else {
          alert(`Imported: ${result.imported.join(", ")}`);
          // Reload data
          setCharacters(getCharacters());
          setWardrobes(getWardrobes());
          setLooks(getLooks());
          setLenses(getLenses());
          setMicroTextures(getMicroTextures());
          setMicroDetails(getMicroDetails());
        }
      } catch {
        alert("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleClearDraft = () => {
    if (confirm("Clear all fields and start fresh?")) {
      setAspectRatio("3x2");
      setOutputMode("compact");
      setSceneHeart("");
      setCast([]);
      setFraming("medium");
      setLensMode("auto");
      setLensProfileId("");
      setLookFamilyId("");
      setEnvironmentAnchors(["", "", "", "", ""]);
      setMechanicLock("");
      setFocusTarget("");
      setSelectedMicroTextures([]);
      setSelectedMicroDetails([]);
    }
  };

  // AI suggestion handlers
  const handleSuggestAnchors = async () => {
    if (!sceneHeart.trim()) {
      alert("Please enter a Scene Heart first");
      return;
    }
    setAnchorLoading(true);
    setAnchorError(null);
    setAnchorModalOpen(true);
    
    const result = await suggestAnchors(sceneHeart);
    setAnchorLoading(false);
    
    if (result.ok && result.data) {
      setAnchorSuggestions({
        candidates: result.data.anchorCandidates,
        recommended: result.data.recommended,
      });
    } else {
      setAnchorError(result.error?.message || "Failed to get suggestions");
    }
  };

  const handleAcceptAnchors = (anchors: string[]) => {
    const newAnchors = [...anchors];
    while (newAnchors.length < 5) newAnchors.push("");
    setEnvironmentAnchors(newAnchors.slice(0, 5));
  };

  const handleSuggestMechanic = async () => {
    if (!sceneHeart.trim()) {
      alert("Please enter a Scene Heart first");
      return;
    }
    setMechanicLoading(true);
    setMechanicError(null);
    setMechanicModalOpen(true);
    
    const castSnippets = cast.map(c => {
      const char = characters.find(ch => ch.id === c.characterId);
      return char?.uiName || "";
    }).filter(Boolean);
    
    const result = await suggestMechanicLock(sceneHeart, castSnippets, framing);
    setMechanicLoading(false);
    
    if (result.ok && result.data) {
      setMechanicSuggestions(result.data.mechanicLocks);
    } else {
      setMechanicError(result.error?.message || "Failed to get suggestions");
    }
  };

  const handleSuggestFocus = async () => {
    if (!sceneHeart.trim()) {
      alert("Please enter a Scene Heart first");
      return;
    }
    setFocusLoading(true);
    setFocusError(null);
    setFocusModalOpen(true);
    
    const selectedLensProfile = lenses.find(l => l.id === lensProfileId);
    const lensInfo = selectedLensProfile ? `${selectedLensProfile.focalLengthMm}mm` : undefined;
    
    const result = await suggestFocusTarget(sceneHeart, framing, lensInfo);
    setFocusLoading(false);
    
    if (result.ok && result.data) {
      setFocusSuggestions(result.data.focusTargets);
    } else {
      setFocusError(result.error?.message || "Failed to get suggestions");
    }
  };

  const handleRunQA = async () => {
    setQaLoading(true);
    setQaResults(null);
    
    const result = await runQACheck(promptRequest);
    setQaLoading(false);
    
    if (result.ok && result.data) {
      setQaResults(result.data);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-canvas-800 flex items-center gap-3">
            <span className="text-4xl">✨</span>
            Prompt Composer
          </h1>
          <p className="text-canvas-600 mt-1">
            Craft structured prompts for Sora image generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="btn btn-secondary cursor-pointer">
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            Import JSON
          </label>
          <button onClick={handleExport} className="btn btn-secondary">
            Export JSON
          </button>
          <button onClick={handleClearDraft} className="btn btn-ghost text-red-500">
            Clear
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
        {/* Main form */}
        <div className="space-y-6">
          {/* Row 1: Aspect ratio, Output mode, Framing */}
          <div className="card p-5">
            <h2 className="font-display text-lg font-semibold text-canvas-800 mb-4">
              Output Settings
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Aspect Ratio</label>
                <select
                  className="select"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                >
                  {ASPECT_RATIO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Output Mode</label>
                <select
                  className="select"
                  value={outputMode}
                  onChange={(e) => setOutputMode(e.target.value as OutputMode)}
                >
                  {OUTPUT_MODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Framing (Coverage)</label>
                <select
                  className="select"
                  value={framing}
                  onChange={(e) => setFraming(e.target.value as Framing)}
                >
                  {FRAMING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — {opt.desc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Scene Heart */}
          <div className="card p-5">
            <label className="label">
              Scene Heart <span className="label-hint">(who/what/where — ONE frozen moment)</span>
            </label>
            <textarea
              className={`textarea min-h-[100px] ${!sceneHeart.trim() ? "border-red-300" : ""}`}
              placeholder="Describe the single frozen instant: who is doing what, where. Be specific about the action and emotion."
              value={sceneHeart}
              onChange={(e) => setSceneHeart(e.target.value)}
            />
          </div>

          {/* Cast + Wardrobe */}
          <div className="card p-5">
            <h2 className="font-display text-lg font-semibold text-canvas-800 mb-4">
              Cast & Wardrobe
            </h2>
            <CastWardrobeBinder
              characters={characters}
              wardrobes={wardrobes}
              cast={cast}
              onChange={setCast}
            />
          </div>

          {/* Look & Lens */}
          <div className="card p-5">
            <h2 className="font-display text-lg font-semibold text-canvas-800 mb-4">
              Look & Lens
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="label">Look Family</label>
                <select
                  className={`select ${!lookFamilyId ? "border-red-300" : ""}`}
                  value={lookFamilyId}
                  onChange={(e) => setLookFamilyId(e.target.value)}
                >
                  <option value="">Select a look...</option>
                  {looks.map((look) => (
                    <option key={look.id} value={look.id}>
                      {look.uiName} — {look.whenToUse}
                    </option>
                  ))}
                </select>
                <div className="mt-3">
                  <LookInfoPopover look={selectedLook} />
                </div>
              </div>
              <div>
                <label className="label">Lens Mode</label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setLensMode("auto")}
                    className={`btn flex-1 ${lensMode === "auto" ? "btn-primary" : "btn-secondary"}`}
                  >
                    Auto (Look Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLensMode("manual")}
                    className={`btn flex-1 ${lensMode === "manual" ? "btn-primary" : "btn-secondary"}`}
                  >
                    Manual
                  </button>
                </div>
                {lensMode === "manual" && (
                  <div>
                    <label className="label text-sm">Select Lens</label>
                    <select
                      className={`select ${!lensProfileId ? "border-red-300" : ""}`}
                      value={lensProfileId}
                      onChange={(e) => setLensProfileId(e.target.value)}
                    >
                      <option value="">Select a lens...</option>
                      {lenses.map((lens) => (
                        <option key={lens.id} value={lens.id}>
                          {lens.uiName} ({lens.focalLengthMm}mm)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {lensMode === "auto" && selectedLook && (
                  <p className="text-sm text-canvas-600 bg-canvas-50 p-3 rounded-lg">
                    Auto-selecting <strong>{selectedLook.recommendedLensByFraming[framing]}mm</strong> based on{" "}
                    <em>{selectedLook.uiName}</em> + <em>{framing.replace("_", " ")}</em> framing
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Environment Anchors */}
          <div className="card p-5">
            <AnchorFields
              anchors={environmentAnchors}
              onChange={setEnvironmentAnchors}
              onSuggest={handleSuggestAnchors}
              isLoadingSuggestions={anchorLoading}
            />
          </div>

          {/* Mechanic Lock & Focus Target */}
          <div className="card p-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">
                    Mechanic Lock <span className="label-hint">(cause → effect)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestMechanic}
                    disabled={mechanicLoading}
                    className="text-sm text-paw-600 hover:text-paw-700 disabled:opacity-50"
                  >
                    {mechanicLoading ? "⏳" : "✨"} AI Suggest
                  </button>
                </div>
                <textarea
                  className={`textarea ${!mechanicLock.trim() ? "border-red-300" : ""}`}
                  placeholder="One sentence: what causes what effect in this moment?"
                  value={mechanicLock}
                  onChange={(e) => setMechanicLock(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">
                    Focus Target <span className="label-hint">(what MUST be sharp)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestFocus}
                    disabled={focusLoading}
                    className="text-sm text-paw-600 hover:text-paw-700 disabled:opacity-50"
                  >
                    {focusLoading ? "⏳" : "✨"} AI Suggest
                  </button>
                </div>
                <textarea
                  className={`textarea ${!focusTarget.trim() ? "border-red-300" : ""}`}
                  placeholder="e.g., Focus on the dragon's face and torso; background secondary"
                  value={focusTarget}
                  onChange={(e) => setFocusTarget(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Micro Packs */}
          <div className="card p-5">
            <h2 className="font-display text-lg font-semibold text-canvas-800 mb-4">
              Micro Packs
            </h2>
            <MicroPackSelectors
              texturePacks={microTextures}
              detailPacks={microDetails}
              selectedTextures={selectedMicroTextures}
              selectedDetails={selectedMicroDetails}
              onTexturesChange={setSelectedMicroTextures}
              onDetailsChange={setSelectedMicroDetails}
            />
          </div>

          {/* Validation */}
          <div className="card p-5">
            <h2 className="font-display text-lg font-semibold text-canvas-800 mb-4">
              Validation
            </h2>
            <ValidationPanel 
              errors={validationErrors} 
              onRunQA={handleRunQA}
              isLoadingQA={qaLoading}
            />
            {qaResults && (qaResults.warnings.length > 0 || qaResults.suggestedFixes.length > 0) && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h4 className="font-semibold text-blue-800 mb-2">AI QA Results</h4>
                {qaResults.warnings.length > 0 && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-blue-700">Warnings:</span>
                    <ul className="list-disc list-inside text-sm text-blue-600 mt-1">
                      {qaResults.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
                {qaResults.suggestedFixes.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-blue-700">Suggestions:</span>
                    <ul className="list-disc list-inside text-sm text-blue-600 mt-1">
                      {qaResults.suggestedFixes.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preview sidebar */}
        <div className="lg:relative">
          <PromptPreview
            compiledText={compiledResult?.text || ""}
            seedSummary={compiledResult?.seedSummary || ""}
            lensSource={compiledResult?.resolvedLens.source || "auto"}
            lensWarning={compiledResult?.resolvedLens.warning}
            canCompile={canCompile}
          />
        </div>
      </div>

      {/* AI Suggestion Modals */}
      <AnchorSuggestionModal
        isOpen={anchorModalOpen}
        onClose={() => setAnchorModalOpen(false)}
        candidates={anchorSuggestions.candidates}
        recommended={anchorSuggestions.recommended}
        onAccept={handleAcceptAnchors}
        isLoading={anchorLoading}
        error={anchorError}
      />

      <AISuggestionModal
        isOpen={mechanicModalOpen}
        onClose={() => setMechanicModalOpen(false)}
        title="AI Mechanic Lock Suggestions"
        suggestions={mechanicSuggestions}
        renderSuggestion={(item) => (
          <p className="text-sm text-canvas-700">{item}</p>
        )}
        onAccept={(item) => setMechanicLock(item)}
        isLoading={mechanicLoading}
        error={mechanicError}
      />

      <AISuggestionModal
        isOpen={focusModalOpen}
        onClose={() => setFocusModalOpen(false)}
        title="AI Focus Target Suggestions"
        suggestions={focusSuggestions}
        renderSuggestion={(item) => (
          <p className="text-sm text-canvas-700">{item}</p>
        )}
        onAccept={(item) => setFocusTarget(item)}
        isLoading={focusLoading}
        error={focusError}
      />
    </div>
  );
}

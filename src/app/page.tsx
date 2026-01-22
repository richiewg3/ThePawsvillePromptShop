"use client";

import { useState, useMemo, useCallback } from "react";
import {
  PromptRequest,
  CastMember,
  AspectRatio,
  OutputMode,
  Framing,
  LensMode,
  validatePromptRequest,
} from "@/lib/schemas";
import { compilePrompt, CompilerContext } from "@/lib/compiler";
import { downloadJson } from "@/lib/storage";
import { CastWardrobeBinder } from "@/components/cast-wardrobe-binder";
import { AnchorFields } from "@/components/anchor-fields";
import { MicroPackSelectors } from "@/components/micro-pack-selectors";
import { ValidationPanel } from "@/components/validation-panel";
import { PromptPreview } from "@/components/prompt-preview";
import { LookInfoPopover } from "@/components/look-info-popover";
import { AISuggestionModal, AnchorSuggestionModal } from "@/components/ai-suggestion-modal";
import { ProjectsList } from "@/components/projects-list";
import { PromptsList } from "@/components/prompts-list";
import { PromptHistory } from "@/components/prompt-history";
import { useProject } from "@/hooks/useProject";
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
  // Project management hook - ALL DATA comes from here, saved to Azure
  const {
    projects,
    projectsLoading,
    refreshProjects,
    currentProject,
    projectLoading,
    openProject,
    closeProject,
    createProject,
    deleteProject,
    renameProject,
    currentPrompt,
    openPrompt,
    closePrompt,
    createPrompt,
    deletePrompt,
    renamePrompt,
    duplicatePrompt,
    updatePromptRequest,
    saveHistoryEntry,
    restoreFromHistory,
    // ALL data comes from the project (saved to Azure)
    characters,
    wardrobes,
    looks,
    lenses,
    microTextures,
    microDetails,
    storageMode,
    isSaving,
    lastSaved,
    saveNow,
  } = useProject();

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

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when opening a prompt on mobile
  const handleOpenPrompt = useCallback((id: string) => {
    openPrompt(id);
    setSidebarOpen(false);
  }, [openPrompt]);

  // Get current prompt request data (from project or defaults)
  const promptRequest = currentPrompt?.promptRequest || {};
  
  // Form field getters with defaults
  const aspectRatio = (promptRequest.aspectRatio as AspectRatio) || "3x2";
  const outputMode = (promptRequest.outputMode as OutputMode) || "compact";
  const sceneHeart = promptRequest.sceneHeart || "";
  const cast = (promptRequest.cast as CastMember[]) || [];
  const framing = (promptRequest.framing as Framing) || "medium";
  const lensMode = (promptRequest.lensMode as LensMode) || "auto";
  const lensProfileId = promptRequest.lensProfileId || "";
  const lookFamilyId = promptRequest.lookFamilyId || "";
  const environmentAnchors = promptRequest.environmentAnchors || ["", "", "", "", ""];
  const mechanicLock = promptRequest.mechanicLock || "";
  const focusTarget = promptRequest.focusTarget || "";
  const selectedMicroTextures = promptRequest.selectedMicroTextures || [];
  const selectedMicroDetails = promptRequest.selectedMicroDetails || [];

  // Form field setters - all update via hook (saved to Azure)
  const setAspectRatio = (value: AspectRatio) => updatePromptRequest({ aspectRatio: value });
  const setOutputMode = (value: OutputMode) => updatePromptRequest({ outputMode: value });
  const setSceneHeart = (value: string) => updatePromptRequest({ sceneHeart: value });
  const setCast = (value: CastMember[]) => updatePromptRequest({ cast: value });
  const setFraming = (value: Framing) => updatePromptRequest({ framing: value });
  const setLensMode = (value: LensMode) => updatePromptRequest({ lensMode: value });
  const setLensProfileId = (value: string) => updatePromptRequest({ lensProfileId: value });
  const setLookFamilyId = (value: string) => updatePromptRequest({ lookFamilyId: value });
  const setEnvironmentAnchors = (value: string[]) => updatePromptRequest({ environmentAnchors: value });
  const setMechanicLock = (value: string) => updatePromptRequest({ mechanicLock: value });
  const setFocusTarget = (value: string) => updatePromptRequest({ focusTarget: value });
  const setSelectedMicroTextures = (value: string[]) => updatePromptRequest({ selectedMicroTextures: value });
  const setSelectedMicroDetails = (value: string[]) => updatePromptRequest({ selectedMicroDetails: value });

  // Build full request for validation/compilation
  const fullPromptRequest: Partial<PromptRequest> = useMemo(
    () => ({
      id: currentPrompt?.id || crypto.randomUUID(),
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
      createdAt: currentPrompt?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    [
      currentPrompt,
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
    () => validatePromptRequest(fullPromptRequest, characters, wardrobes, looks, lenses),
    [fullPromptRequest, characters, wardrobes, looks, lenses]
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
    return compilePrompt(fullPromptRequest as PromptRequest, context);
  }, [canCompile, fullPromptRequest, characters, wardrobes, looks, lenses, microTextures, microDetails]);

  // Selected look for info display
  const selectedLook = looks.find((l) => l.id === lookFamilyId) || null;

  // Export handler
  const handleExport = () => {
    if (!currentProject) return;
    downloadJson(currentProject, `pawsville-project-${currentProject.id}.json`);
  };

  const handleClearPrompt = () => {
    if (!currentPrompt) return;
    if (confirm("Clear all fields for this prompt?")) {
      // Save history first
      saveHistoryEntry("Before clearing");
      // Reset all fields
      updatePromptRequest({
        aspectRatio: "3x2",
        outputMode: "compact",
        sceneHeart: "",
        cast: [],
        framing: "medium",
        lensMode: "auto",
        lensProfileId: "",
        lookFamilyId: "",
        environmentAnchors: ["", "", "", "", ""],
        mechanicLock: "",
        focusTarget: "",
        selectedMicroTextures: [],
        selectedMicroDetails: [],
      });
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
    
    const result = await runQACheck(fullPromptRequest);
    setQaLoading(false);
    
    if (result.ok && result.data) {
      setQaResults(result.data);
    }
  };

  // ============================================
  // RENDER: Projects List (no project open)
  // ============================================
  if (!currentProject) {
    return (
      <ProjectsList
        projects={projects}
        loading={projectsLoading}
        storageMode={storageMode}
        onOpenProject={openProject}
        onCreateProject={async (name) => {
          await createProject(name);
        }}
        onDeleteProject={deleteProject}
        onRefresh={refreshProjects}
      />
    );
  }

  // ============================================
  // RENDER: Project View (with prompts sidebar)
  // ============================================
  return (
    <div className="animate-fade-in flex flex-col lg:flex-row lg:h-[calc(100vh-120px)] gap-4 lg:gap-6">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden flex items-center justify-between bg-white rounded-xl p-3 shadow-soft border border-canvas-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {currentPrompt ? currentPrompt.title : "Select Prompt"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${
            storageMode === "azure" 
              ? "bg-blue-100 text-blue-700" 
              : "bg-amber-100 text-amber-700"
          }`}>
            {isSaving ? "Saving..." : (storageMode === "azure" ? "Cloud" : "Local")}
          </span>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Prompts Sidebar - Desktop: always visible, Mobile: slide-in drawer */}
      <div className={`
        lg:w-72 lg:shrink-0 lg:relative lg:block
        fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw]
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        bg-white lg:rounded-2xl shadow-soft lg:border lg:border-canvas-200 overflow-hidden flex flex-col
      `}>
        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 z-10 p-2 rounded-full bg-canvas-100 hover:bg-canvas-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <PromptsList
          project={currentProject}
          currentPromptId={currentPrompt?.id || null}
          onOpenPrompt={handleOpenPrompt}
          onCreatePrompt={createPrompt}
          onDeletePrompt={deletePrompt}
          onRenamePrompt={renamePrompt}
          onDuplicatePrompt={duplicatePrompt}
          onCloseProject={closeProject}
          onRenameProject={renameProject}
          storageMode={storageMode}
          isSaving={isSaving}
          lastSaved={lastSaved}
          onSaveNow={saveNow}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto lg:overflow-y-auto">
        {!currentPrompt ? (
          // No prompt selected
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">&#128221;</div>
              <h2 className="text-xl font-semibold text-canvas-800 mb-2">
                Select or Create a Prompt
              </h2>
              <p className="text-canvas-600 mb-4">
                Choose a prompt from the sidebar or create a new one to get started.
              </p>
              <button
                onClick={() => createPrompt("New Prompt")}
                className="btn btn-primary"
              >
                + Create New Prompt
              </button>
            </div>
          </div>
        ) : (
          // Prompt Editor
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-canvas-800">
                  {currentPrompt.title}
                </h1>
                <p className="text-canvas-600 mt-1 text-xs sm:text-sm hidden sm:block">
                  Editing prompt in project: {currentProject.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleExport} className="btn btn-secondary text-sm">
                  Export
                </button>
                <button onClick={handleClearPrompt} className="btn btn-ghost text-red-500 text-sm">
                  Clear
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:gap-6 xl:grid-cols-[1fr,400px]">
              {/* Main form */}
              <div className="space-y-6">
                {/* Row 1: Aspect ratio, Output mode, Framing */}
                <div className="card p-4 sm:p-5">
                  <h2 className="font-display text-base sm:text-lg font-semibold text-canvas-800 mb-3 sm:mb-4">
                    Output Settings
                  </h2>
                  <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
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
                <div className="card p-4 sm:p-5">
                  <label className="label">
                    Scene Heart <span className="label-hint hidden sm:inline">(who/what/where — ONE frozen moment)</span>
                  </label>
                  <textarea
                    className={`textarea min-h-[100px] ${!sceneHeart.trim() ? "border-red-300" : ""}`}
                    placeholder="Describe the single frozen instant: who is doing what, where. Be specific about the action and emotion."
                    value={sceneHeart}
                    onChange={(e) => setSceneHeart(e.target.value)}
                  />
                </div>

                {/* Cast + Wardrobe */}
                <div className="card p-4 sm:p-5">
                  <h2 className="font-display text-base sm:text-lg font-semibold text-canvas-800 mb-3 sm:mb-4">
                    Cast & Wardrobe
                  </h2>
                  {characters.length === 0 ? (
                    <div className="text-center py-8 bg-canvas-50 rounded-lg border border-dashed border-canvas-300">
                      <p className="text-canvas-600 mb-2">No characters in this project yet.</p>
                      <p className="text-sm text-canvas-500">Go to the Characters page to create characters for this project.</p>
                    </div>
                  ) : (
                    <CastWardrobeBinder
                      characters={characters}
                      wardrobes={wardrobes}
                      cast={cast}
                      onChange={setCast}
                    />
                  )}
                </div>

                {/* Look & Lens */}
                <div className="card p-4 sm:p-5">
                  <h2 className="font-display text-base sm:text-lg font-semibold text-canvas-800 mb-3 sm:mb-4">
                    Look & Lens
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
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
                <div className="card p-4 sm:p-5">
                  <AnchorFields
                    anchors={environmentAnchors}
                    onChange={setEnvironmentAnchors}
                    onSuggest={handleSuggestAnchors}
                    isLoadingSuggestions={anchorLoading}
                  />
                </div>

                {/* Mechanic Lock & Focus Target */}
                <div className="card p-4 sm:p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="label mb-0">
                          Mechanic Lock <span className="label-hint">(cause to effect)</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleSuggestMechanic}
                          disabled={mechanicLoading}
                          className="text-sm text-paw-600 hover:text-paw-700 disabled:opacity-50"
                        >
                          {mechanicLoading ? "..." : "AI Suggest"}
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
                          {focusLoading ? "..." : "AI Suggest"}
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
                <div className="card p-4 sm:p-5">
                  <h2 className="font-display text-base sm:text-lg font-semibold text-canvas-800 mb-3 sm:mb-4">
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

                {/* History */}
                <div className="card p-4 sm:p-5">
                  <PromptHistory
                    history={currentPrompt.history}
                    onRestore={restoreFromHistory}
                    onSaveSnapshot={saveHistoryEntry}
                  />
                </div>

                {/* Validation */}
                <div className="card p-4 sm:p-5">
                  <h2 className="font-display text-base sm:text-lg font-semibold text-canvas-800 mb-3 sm:mb-4">
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
              <div className="xl:sticky xl:top-4 xl:self-start">
                <PromptPreview
                  compiledText={compiledResult?.text || ""}
                  seedSummary={compiledResult?.seedSummary || ""}
                  lensSource={compiledResult?.resolvedLens.source || "auto"}
                  lensWarning={compiledResult?.resolvedLens.warning}
                  canCompile={canCompile}
                />
              </div>
            </div>
          </>
        )}
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

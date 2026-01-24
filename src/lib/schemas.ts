import { z } from "zod";

// ============================================
// ENUMS & CONSTANTS
// ============================================

export const ASPECT_RATIOS = ["1x1", "2x3", "3x2"] as const;
export const OUTPUT_MODES = ["compact", "expanded"] as const;
export const FRAMINGS = ["face_emotion", "medium", "full_body", "wide_scene"] as const;
export const LENS_CATEGORIES = ["wide", "normal", "tele", "macro"] as const;
export const FOCAL_LENGTHS = [24, 35, 50, 85, 100, 135] as const;
export const LENS_MODES = ["auto", "manual"] as const;

// ============================================
// BASE SCHEMAS
// ============================================

// Character Profile - identity only, no outfits
export const CharacterProfileSchema = z.object({
  id: z.string().min(1),
  uiName: z.string().min(1, "Name is required"),
  injectedText: z.string().min(1, "Identity text is required"),
  // Optional helper subfields (UI convenience, rolled into injectedText)
  helperFields: z.object({
    species: z.string().optional(),
    anatomy: z.string().optional(),
    face: z.string().optional(),
    materials: z.string().optional(),
    signatureTraits: z.string().optional(),
    proportions: z.string().optional(),
    sizeNotes: z.string().optional(),
    bans: z.string().optional(),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Wardrobe Profile - outfit only, each outfit is its own profile
export const WardrobeProfileSchema = z.object({
  id: z.string().min(1),
  uiName: z.string().min(1, "Name is required"),
  outfitText: z.string().min(1, "Outfit text is required"),
  bansText: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Lens Profile - optics configuration
export const LensProfileSchema = z.object({
  id: z.string().min(1),
  uiName: z.string().min(1, "Name is required"),
  focalLengthMm: z.enum(["24", "35", "50", "85", "100", "135"]),
  category: z.enum(LENS_CATEGORIES),
  injectedText: z.string().min(1, "Lens text is required"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Recommended lens mapping per framing
export const RecommendedLensByFramingSchema = z.object({
  face_emotion: z.enum(["24", "35", "50", "85", "100", "135"]),
  medium: z.enum(["24", "35", "50", "85", "100", "135"]),
  full_body: z.enum(["24", "35", "50", "85", "100", "135"]),
  wide_scene: z.enum(["24", "35", "50", "85", "100", "135"]),
});

// Look Family - lighting/grade/finish with metadata
export const LookFamilySchema = z.object({
  id: z.string().min(1),
  uiName: z.string().min(1, "Name is required"),
  // Injected into prompt
  injectedText: z.string().min(1, "Look text is required"),
  // Metadata (UI only, not injected)
  whenToUse: z.string().min(1, "When to use is required"),
  producesSummary: z.array(z.string()),
  exampleUseCase: z.string().optional(),
  opticsBiasNotes: z.string().optional(),
  recommendedLensByFraming: RecommendedLensByFramingSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Micro Texture Pack
export const MicroTexturePackSchema = z.object({
  id: z.string().min(1),
  uiName: z.string().min(1, "Name is required"),
  items: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Micro Detail Pack
export const MicroDetailPackSchema = z.object({
  id: z.string().min(1),
  uiName: z.string().min(1, "Name is required"),
  items: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Cast member with wardrobe binding
export const CastMemberSchema = z.object({
  characterId: z.string().min(1),
  wardrobeId: z.string(),
});

// Environment Lock - stage anchors within a preset
export const StageAnchorSchema = z.object({
  name: z.string().min(1, "Anchor name is required"),
  position: z.string().min(1, "Anchor position is required"),
  materialTexture: z.string().min(1, "Material/texture is required"),
  uniqueDetail: z.string().min(1, "Unique detail is required"),
});

export const EnvironmentPresetSchema = z.object({
  id: z.string().min(1),
  uiName: z.string().min(1, "Preset name is required"),
  sceneDescription: z.string().min(1, "Scene description is required"),
  stageAnchors: z.array(StageAnchorSchema).min(3).max(5),
  spatialLayoutNotes: z.string().min(1, "Spatial layout notes are required"),
  lightingNotes: z.string().min(1, "Lighting notes are required"),
  colorPaletteNotes: z.string().min(1, "Color palette notes are required"),
  cameraViewNotes: z.string().min(1, "Camera/view notes are required"),
  doNotChangeConstraints: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================
// PROMPT REQUEST SCHEMA
// ============================================

export const PromptRequestSchema = z.object({
  id: z.string().min(1),
  // Required fields
  aspectRatio: z.enum(ASPECT_RATIOS),
  outputMode: z.enum(OUTPUT_MODES),
  sceneHeart: z.string().min(1, "Scene heart is required"),
  cast: z.array(CastMemberSchema).min(1, "At least one cast member is required"),
  framing: z.enum(FRAMINGS),
  // Lens mode (from addendum A)
  lensMode: z.enum(LENS_MODES),
  lensProfileId: z.string().optional(), // Required only when lensMode='manual'
  lookFamilyId: z.string(),
  // Environment anchors (3-5)
  environmentAnchors: z.array(z.string()).min(3).max(5),
  mechanicLock: z.string().min(1, "Mechanic lock is required"),
  focusTarget: z.string().min(1, "Focus target is required"),
  // Micro selections (arrays of pack IDs)
  selectedMicroTextures: z.array(z.string()),
  selectedMicroDetails: z.array(z.string()),
  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type AspectRatio = (typeof ASPECT_RATIOS)[number];
export type OutputMode = (typeof OUTPUT_MODES)[number];
export type Framing = (typeof FRAMINGS)[number];
export type LensCategory = (typeof LENS_CATEGORIES)[number];
export type FocalLength = (typeof FOCAL_LENGTHS)[number];
export type LensMode = (typeof LENS_MODES)[number];

export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;
export type WardrobeProfile = z.infer<typeof WardrobeProfileSchema>;
export type LensProfile = z.infer<typeof LensProfileSchema>;
export type LookFamily = z.infer<typeof LookFamilySchema>;
export type MicroTexturePack = z.infer<typeof MicroTexturePackSchema>;
export type MicroDetailPack = z.infer<typeof MicroDetailPackSchema>;
export type CastMember = z.infer<typeof CastMemberSchema>;
export type PromptRequest = z.infer<typeof PromptRequestSchema>;
export type RecommendedLensByFraming = z.infer<typeof RecommendedLensByFramingSchema>;
export type StageAnchor = z.infer<typeof StageAnchorSchema>;
export type EnvironmentPreset = z.infer<typeof EnvironmentPresetSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

export interface ValidationError {
  field: string;
  message: string;
  type: "hard" | "soft";
}

export function validatePromptRequest(
  request: Partial<PromptRequest>,
  characters: CharacterProfile[],
  wardrobes: WardrobeProfile[],
  looks: LookFamily[],
  lenses: LensProfile[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Hard errors (cannot compile)
  if (!request.aspectRatio) {
    errors.push({ field: "aspectRatio", message: "Aspect ratio is required", type: "hard" });
  }
  if (!request.sceneHeart?.trim()) {
    errors.push({ field: "sceneHeart", message: "Scene heart is required", type: "hard" });
  }
  if (!request.cast?.length) {
    errors.push({ field: "cast", message: "At least one cast member is required", type: "hard" });
  }
  // Check wardrobe bindings
  request.cast?.forEach((member, idx) => {
    if (!member.wardrobeId) {
      const char = characters.find((c) => c.id === member.characterId);
      errors.push({
        field: `cast[${idx}].wardrobeId`,
        message: `${char?.uiName || "Character"} is missing wardrobe binding`,
        type: "hard",
      });
    }
  });
  // Anchors
  const anchorCount = request.environmentAnchors?.filter((a) => a.trim()).length || 0;
  if (anchorCount < 3) {
    errors.push({ field: "environmentAnchors", message: "At least 3 environment anchors required", type: "hard" });
  }
  if (anchorCount > 5) {
    errors.push({ field: "environmentAnchors", message: "Maximum 5 environment anchors allowed", type: "hard" });
  }
  if (!request.mechanicLock?.trim()) {
    errors.push({ field: "mechanicLock", message: "Mechanic lock is required", type: "hard" });
  }
  if (!request.focusTarget?.trim()) {
    errors.push({ field: "focusTarget", message: "Focus target is required", type: "hard" });
  }
  if (!request.lookFamilyId) {
    errors.push({ field: "lookFamilyId", message: "Look family is required", type: "hard" });
  }
  if (request.lensMode === "manual" && !request.lensProfileId) {
    errors.push({ field: "lensProfileId", message: "Lens profile required in manual mode", type: "hard" });
  }

  // Soft warnings (compile allowed)
  if (request.sceneHeart && /\b(then|after|next|before)\b/i.test(request.sceneHeart)) {
    errors.push({
      field: "sceneHeart",
      message: "Scene heart may contain multi-action phrases (then/after/next)",
      type: "soft",
    });
  }
  // Wide lens + tight framing warning
  if (request.lensMode === "manual" && request.lensProfileId && request.framing === "face_emotion") {
    const lens = lenses.find((l) => l.id === request.lensProfileId);
    if (lens && (lens.focalLengthMm === "24" || lens.focalLengthMm === "35")) {
      errors.push({
        field: "lensProfileId",
        message: "Wide lens with tight face framing may cause distortion",
        type: "soft",
      });
    }
  }
  // Vague anchor warning
  const vagueAnchors = request.environmentAnchors?.filter((a) =>
    /^(stuff|things|items|objects|misc|etc)$/i.test(a.trim())
  );
  if (vagueAnchors?.length) {
    errors.push({
      field: "environmentAnchors",
      message: "Some anchors may be too vague",
      type: "soft",
    });
  }

  return errors;
}

// ============================================
// AI RESPONSE SCHEMAS
// ============================================

export const AIResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    data: z.unknown(),
  }),
  z.object({
    ok: z.literal(false),
    error: z.object({
      message: z.string(),
      code: z.string().optional(),
    }),
  }),
]);

export const AnchorSuggestionsSchema = z.object({
  anchorCandidates: z.array(z.string()).length(10),
  recommended: z.array(z.string()).length(5),
});

export const MechanicLockSuggestionsSchema = z.object({
  mechanicLocks: z.array(z.string()).length(5),
});

export const FocusTargetSuggestionsSchema = z.object({
  focusTargets: z.array(z.string()).length(3),
});

export const MicroDetailSuggestionsSchema = z.object({
  microDetails: z.array(z.string()).length(12),
});

export const QASuggestionsSchema = z.object({
  warnings: z.array(z.string()),
  suggestedFixes: z.array(z.string()),
});

// Scene Heart Upgrade response - contains 3 rewritten versions + anchor suggestions
export const SceneHeartUpgradeSchema = z.object({
  versions: z.object({
    clean: z.string(),
    cinematic: z.string(),
    precise: z.string(),
  }),
  anchorCandidates: z.array(z.string()).min(8).max(12),
  recommendedAnchors: z.array(z.string()).min(3).max(5),
});

export type AIResponse = z.infer<typeof AIResponseSchema>;
export type AnchorSuggestions = z.infer<typeof AnchorSuggestionsSchema>;
export type MechanicLockSuggestions = z.infer<typeof MechanicLockSuggestionsSchema>;
export type FocusTargetSuggestions = z.infer<typeof FocusTargetSuggestionsSchema>;
export type MicroDetailSuggestions = z.infer<typeof MicroDetailSuggestionsSchema>;
export type QASuggestions = z.infer<typeof QASuggestionsSchema>;
export type SceneHeartUpgrade = z.infer<typeof SceneHeartUpgradeSchema>;

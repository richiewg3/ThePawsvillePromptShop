import { LookFamily, LensProfile, MicroTexturePack, MicroDetailPack } from "@/lib/schemas";

// ============================================
// DEFAULT LOOK FAMILIES (with lens mappings from addendum A)
// ============================================

export const defaultLookFamilies: LookFamily[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    uiName: "Cozy Chiaroscuro Interior",
    injectedText:
      "Warm interior lighting with dramatic chiaroscuro contrast. Deep shadows carve the space while golden light pools on key surfaces. Rich amber tones in highlights, cool slate in shadows. Cinematic grain, subtle vignette, painterly finish with maintained detail in midtones.",
    whenToUse: "Dramatic mood with shadows, intimate interior scenes",
    producesSummary: [
      "Deep shadows with golden highlights",
      "Warm amber-to-cool shadow gradient",
      "Cinematic grain texture",
      "Painterly finish",
    ],
    exampleUseCase: "Character reading by firelight, cozy cabin scene",
    recommendedLensByFraming: {
      face_emotion: "85",
      medium: "50",
      full_body: "35",
      wide_scene: "24",
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    uiName: "Golden Hour Rimlight",
    injectedText:
      "Backlit golden hour lighting with pronounced rim light separation. Warm orange-gold light wraps around subjects creating luminous edges. Fill is soft and cool by comparison. Color grade leans warm with lifted shadows. Soft glow on highlights, clean finish with subtle lens flare potential.",
    whenToUse: "Warm glow with rim separation, outdoor golden hour feel",
    producesSummary: [
      "Backlit rim light separation",
      "Warm orange-gold wrap",
      "Lifted cool shadows",
      "Soft highlight glow",
    ],
    exampleUseCase: "Sunset portrait, outdoor adventure moment",
    recommendedLensByFraming: {
      face_emotion: "85",
      medium: "50",
      full_body: "35",
      wide_scene: "24",
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    uiName: "Mixed Warm + Cool Practical",
    injectedText:
      "Mixed practical lighting with warm tungsten key and cool ambient fill. Realistic interior feel with visible light sources motivating the scheme. Balanced color grade preserving both warm and cool zones. Clean digital finish with controlled highlights and rich shadow detail.",
    whenToUse: "Lit by practicals/screens, realistic interior lighting",
    producesSummary: [
      "Warm tungsten + cool ambient mix",
      "Motivated practical light sources",
      "Balanced warm/cool zones",
      "Rich shadow detail",
    ],
    exampleUseCase: "Character working at desk with lamp, modern interior",
    recommendedLensByFraming: {
      face_emotion: "85",
      medium: "50",
      full_body: "35",
      wide_scene: "35",
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    uiName: "Studio Seamless",
    injectedText:
      "Clean studio lighting on seamless backdrop. Soft key with fill for even illumination. Neutral color grade for accurate color reproduction. Crisp focus throughout, minimal grain, product-photography clarity. White or light gray seamless background with subtle gradient.",
    whenToUse: "Clean product/clarity-first, studio portrait style",
    producesSummary: [
      "Even studio illumination",
      "Neutral accurate colors",
      "Product-photography clarity",
      "Seamless backdrop",
    ],
    exampleUseCase: "Character showcase, product-style portrait, catalog look",
    recommendedLensByFraming: {
      face_emotion: "85",
      medium: "85",
      full_body: "50",
      wide_scene: "35",
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    uiName: "Black Background Hero",
    injectedText:
      "Dramatic single-subject lighting against pure black void. Strong directional key creating bold highlight-to-shadow ratio. Subject isolated completely from environment. High contrast grade with crushed blacks and punchy highlights. Clean finish, sharp detail on subject, total background separation.",
    whenToUse: "Isolation on black, dramatic hero shot",
    producesSummary: [
      "Pure black void background",
      "Bold directional key",
      "Total subject isolation",
      "High contrast crushed blacks",
    ],
    exampleUseCase: "Hero character reveal, dramatic portrait, isolated figure",
    opticsBiasNotes: "135mm optional for extra isolation",
    recommendedLensByFraming: {
      face_emotion: "85",
      medium: "85",
      full_body: "50",
      wide_scene: "35",
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
];

// ============================================
// DEFAULT LENS PROFILES
// ============================================

export const defaultLensProfiles: LensProfile[] = [
  {
    id: "00000000-0000-0000-0001-000000000001",
    uiName: "24mm Wide",
    focalLengthMm: "24",
    category: "wide",
    injectedText:
      "24mm wide-angle lens perspective. Expansive field of view capturing environment context. Noticeable perspective distortion toward edges. Deep depth of field keeping foreground through background sharp. Dramatic sense of space and scale.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0001-000000000002",
    uiName: "35mm Standard Wide",
    focalLengthMm: "35",
    category: "wide",
    injectedText:
      "35mm standard wide lens perspective. Natural field of view similar to human peripheral vision. Minimal distortion while maintaining environmental context. Moderate depth of field, versatile for both portraits and scenes.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0001-000000000003",
    uiName: "50mm Normal",
    focalLengthMm: "50",
    category: "normal",
    injectedText:
      "50mm normal lens perspective. Classic field of view matching natural human vision. Minimal geometric distortion, honest rendering of proportions. Moderate background separation at wider apertures. Balanced, neutral perspective.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0001-000000000004",
    uiName: "85mm Portrait",
    focalLengthMm: "85",
    category: "tele",
    injectedText:
      "85mm portrait telephoto perspective. Flattering compression for faces and figures. Pronounced background separation with creamy bokeh. Isolates subject from environment. Classic portrait focal length.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0001-000000000005",
    uiName: "135mm Telephoto",
    focalLengthMm: "135",
    category: "tele",
    injectedText:
      "135mm telephoto perspective. Strong compression flattening planes. Maximum subject isolation with heavily blurred backgrounds. Intimate feel despite apparent distance. Dramatic separation from environment.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0001-000000000006",
    uiName: "100mm Macro",
    focalLengthMm: "100",
    category: "macro",
    injectedText:
      "100mm macro lens perspective. Extreme close-up capability revealing fine detail. Razor-thin depth of field isolating specific elements. Telephoto compression with macro magnification. Reveals textures invisible to naked eye.",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
];

// ============================================
// DEFAULT MICRO TEXTURE PACKS
// ============================================

export const defaultMicroTexturePacks: MicroTexturePack[] = [
  {
    id: "00000000-0000-0000-0002-000000000001",
    uiName: "Fur & Feather",
    items: [
      "individual fur strands with natural variation",
      "soft downy undercoat visible beneath guard hairs",
      "feather barbules catching light",
      "whisker texture with subtle translucency",
      "scale-to-fur transition zones",
    ],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0002-000000000002",
    uiName: "Fabric & Cloth",
    items: [
      "visible weave pattern in fabric",
      "thread-level detail in stitching",
      "fabric pile direction and nap",
      "subtle fabric sheen variation",
      "worn edges and soft fraying",
    ],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0002-000000000003",
    uiName: "Wood & Organic",
    items: [
      "wood grain with growth ring variation",
      "bark texture with natural fissures",
      "leaf vein patterns",
      "moss and lichen micro-detail",
      "weathered wood silver patina",
    ],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0002-000000000004",
    uiName: "Metal & Hard Surface",
    items: [
      "brushed metal directional scratches",
      "patina and oxidation variation",
      "micro-scratches on polished surfaces",
      "cast metal surface porosity",
      "chrome reflection distortion",
    ],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0002-000000000005",
    uiName: "Skin & Leather",
    items: [
      "leather grain with natural variation",
      "skin pore detail and fine lines",
      "scale texture with iridescence",
      "weathered leather cracking",
      "reptilian scale overlap patterns",
    ],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
];

// ============================================
// DEFAULT MICRO DETAIL PACKS
// ============================================

export const defaultMicroDetailPacks: MicroDetailPack[] = [
  {
    id: "00000000-0000-0000-0003-000000000001",
    uiName: "Atmospheric Effects",
    items: [
      "visible dust motes floating in light beams",
      "subtle steam or breath vapor",
      "atmospheric haze in distance",
      "light rays through windows",
      "particle scatter in backlight",
    ],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0003-000000000002",
    uiName: "Wear & Age",
    items: [
      "scuff marks on floors and walls",
      "paint chips revealing layers beneath",
      "rust blooms on metal fixtures",
      "worn smooth edges from use",
      "accumulated dust in corners",
    ],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0003-000000000003",
    uiName: "Environmental Clutter",
    items: [
      "small objects casting appropriate shadows",
      "background items partially visible",
      "appropriate debris and detritus",
      "incidental props supporting scene",
      "realistic clutter density",
    ],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0003-000000000004",
    uiName: "Light Interactions",
    items: [
      "subsurface scattering in ears/thin materials",
      "caustic light patterns through glass",
      "reflected color bounce between surfaces",
      "rim light catching fine hairs/fibers",
      "specular highlights on wet surfaces",
    ],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0003-000000000005",
    uiName: "Signs of Life",
    items: [
      "fingerprints on smooth surfaces",
      "condensation on cold objects",
      "crumbs and food remnants",
      "disturbed dust patterns",
      "recently moved object imprints",
    ],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
];

// ============================================
// FRAMING COMPOSITION INJECTIONS
// ============================================

export const FRAMING_COMPOSITIONS: Record<string, string> = {
  face_emotion:
    "Tight face/emotion close-up; eyes are the sharp focus; keep facial expression fully visible; simplified background; avoid awkward cropping of chin/forehead",
  medium:
    "Waist-up framing; hands visible if relevant; clear silhouette; environment present but secondary",
  full_body:
    "Full-body head-to-toe; hands and feet visible; NO CROPPING; clear silhouette; anchors visible",
  wide_scene:
    "Wide scene; full bodies plus environment; anchors clearly visible; readable action; foreground/midground/background separation",
};

// ============================================
// LOOK DECISION TREE (UI helper text)
// ============================================

export const LOOK_DECISION_TREE = [
  { condition: "Clean product/clarity-first", recommendation: "Studio Seamless" },
  { condition: "Dramatic mood with shadows", recommendation: "Cozy Chiaroscuro Interior" },
  { condition: "Warm glow + rim separation", recommendation: "Golden Hour Rimlight" },
  { condition: "Lit by practicals/screens", recommendation: "Mixed Warm + Cool Practical" },
  { condition: "Isolation on black", recommendation: "Black Background Hero" },
];

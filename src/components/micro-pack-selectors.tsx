"use client";

import { MicroTexturePack, MicroDetailPack } from "@/lib/schemas";

interface MicroPackSelectorsProps {
  texturePacks: MicroTexturePack[];
  detailPacks: MicroDetailPack[];
  selectedTextures: string[];
  selectedDetails: string[];
  onTexturesChange: (ids: string[]) => void;
  onDetailsChange: (ids: string[]) => void;
}

export function MicroPackSelectors({
  texturePacks,
  detailPacks,
  selectedTextures,
  selectedDetails,
  onTexturesChange,
  onDetailsChange,
}: MicroPackSelectorsProps) {
  const toggleTexture = (id: string) => {
    if (selectedTextures.includes(id)) {
      onTexturesChange(selectedTextures.filter((t) => t !== id));
    } else {
      onTexturesChange([...selectedTextures, id]);
    }
  };

  const toggleDetail = (id: string) => {
    if (selectedDetails.includes(id)) {
      onDetailsChange(selectedDetails.filter((d) => d !== id));
    } else {
      onDetailsChange([...selectedDetails, id]);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Micro-textures */}
      <div>
        <label className="label">
          Micro-Textures{" "}
          <span className="label-hint">({selectedTextures.length} selected)</span>
        </label>
        <p className="text-xs text-canvas-500 mb-3">
          Surface-level material details
        </p>
        {texturePacks.length === 0 ? (
          <p className="text-sm text-canvas-400 italic">No texture packs available</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {texturePacks.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => toggleTexture(pack.id)}
                className={`group relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedTextures.includes(pack.id)
                    ? "bg-paw-500 text-white shadow-md"
                    : "bg-canvas-100 text-canvas-700 hover:bg-canvas-200"
                }`}
              >
                🧵 {pack.uiName}
                {/* Tooltip */}
                <span className="tooltip -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-48 group-hover:visible group-hover:opacity-100">
                  {pack.items.slice(0, 3).join(", ")}
                  {pack.items.length > 3 && "..."}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Micro-details */}
      <div>
        <label className="label">
          Micro-Details{" "}
          <span className="label-hint">({selectedDetails.length} selected)</span>
        </label>
        <p className="text-xs text-canvas-500 mb-3">
          Environmental and atmospheric elements
        </p>
        {detailPacks.length === 0 ? (
          <p className="text-sm text-canvas-400 italic">No detail packs available</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {detailPacks.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => toggleDetail(pack.id)}
                className={`group relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedDetails.includes(pack.id)
                    ? "bg-paw-500 text-white shadow-md"
                    : "bg-canvas-100 text-canvas-700 hover:bg-canvas-200"
                }`}
              >
                ✨ {pack.uiName}
                {/* Tooltip */}
                <span className="tooltip -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-48 group-hover:visible group-hover:opacity-100">
                  {pack.items.slice(0, 3).join(", ")}
                  {pack.items.length > 3 && "..."}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

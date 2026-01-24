"use client";

const tools = [
  {
    name: "Character View Generator",
    href: "https://opal.google/?flow=drive:/1jDjozCW0gH7O17ius29C7ANC9xoypMX0&shared&mode=app",
    emoji: "🧍",
  },
  {
    name: "Character & Wardrobe Analysis",
    href: "https://opal.google/?flow=drive:/1f-B3WFcUmcQ0xp7MLdDeOMNpJWrRto2s&shared&mode=app",
    emoji: "👕",
  },
  {
    name: "Environment Scene Describer",
    href: "https://opal.google/?flow=drive:/1GlIdZFPRxmoojU7ThjHsmiSUFdiJ9tll&shared&mode=app",
    emoji: "🌲",
  },
];

export default function ToolsPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="card p-6">
        <h1 className="font-display text-3xl font-bold text-canvas-800 mb-2">Tools</h1>
        <p className="text-canvas-600">
          Open external helper apps in a new tab to save API cost. These links do not navigate away from the Prompt Shop.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <a
            key={tool.href}
            href={tool.href}
            target="_blank"
            rel="noopener noreferrer"
            className="card card-hover p-5 flex items-center gap-3"
          >
            <span className="text-2xl">{tool.emoji}</span>
            <div>
              <p className="font-semibold text-canvas-800">{tool.name}</p>
              <p className="text-xs text-canvas-500">Opens in a new tab</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

# The Pawsville Prompt Shop

A structured prompt compiler for Sora (and similar) image generation. Build deterministic, well-organized prompts for anthropomorphic character scenes with a beautiful, intuitive interface.

## Features

- **Multi-Project Support** - Organize prompts into projects stored in Azure Blob Storage
- **Multiple Prompts per Project** - Create and manage multiple prompts within each project
- **Version History** - Collapsible history per prompt with restore functionality
- **Auto-Save** - Changes auto-save every 30 seconds + on user actions
- **Prompt Composer** - Main screen for crafting prompts with live preview
- **Character Manager** - Create identity profiles (species, anatomy, traits)
- **Wardrobe Manager** - Create outfit profiles to bind to characters
- **Look Manager** - Define lighting, color grade, and finish combinations
- **Lens Manager** - Configure optical characteristics per focal length
- **Micro Packs Manager** - Manage texture and detail packs for scene richness

### Key Capabilities

- **Deterministic Compilation** - Prompts compile in a fixed, predictable order
- **Paired Cast Output** - Character identity and wardrobe are always adjacent (prevents outfit mixing)
- **Auto Lens Selection** - Looks can auto-select appropriate lenses based on framing
- **AI Suggestions** - OpenRouter-powered suggestions for anchors, mechanics, focus targets, and QA
- **Cloud Storage** - Azure Blob Storage for persistent multi-project storage
- **LocalStorage Fallback** - Works offline with automatic local backup
- **Import/Export** - Full JSON export/import for backups and sharing

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/richiewg3/ThePawsvillePromptShop.git
cd ThePawsvillePromptShop

# Install dependencies
npm install

# Copy environment file and add your OpenRouter API key (optional for AI features)
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start crafting prompts.

### Azure Blob Storage Setup (Optional, Recommended)

For persistent cloud storage of projects, set up Azure Blob Storage:

1. Create an Azure Storage Account at [portal.azure.com](https://portal.azure.com)
2. Create a container named `pawsvillepromptshop`
3. Get your connection string from Storage Account > Access keys
4. Add it to your `.env.local` file:

```
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=pawsvillepromptshop;AccountKey=...;EndpointSuffix=core.windows.net
```

**For Vercel Deployment:**
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add `AZURE_STORAGE_CONNECTION_STRING` with your connection string

**Storage Structure:**
```
pawsvillepromptshop/
└── projects/
    ├── proj_abc123.json
    ├── proj_def456.json
    └── ...
```

**LocalStorage Fallback:**
If Azure is not configured or unavailable, the app automatically falls back to localStorage. All data is also backed up locally.

### AI Features (Optional)

To enable AI suggestions, you'll need an [OpenRouter API key](https://openrouter.ai/keys):

1. Create an account at openrouter.ai
2. Generate an API key
3. Add it to your `.env.local` file:

```
OPENROUTER_API_KEY=your_key_here
```

The app uses free models by default (`qwen/qwen3-235b-a22b:free`).

## Usage

### 1. Set Up Your Library

Before composing prompts, populate your library:

1. **Characters** (`/characters`) - Create identity profiles for your cast
2. **Wardrobes** (`/wardrobes`) - Create outfit profiles
3. **Looks** (`/looks`) - Default looks are pre-seeded, but you can customize
4. **Lenses** (`/lenses`) - Default lenses are pre-seeded
5. **Micro Packs** (`/micro-packs`) - Default packs are pre-seeded

### 2. Compose a Prompt

On the main Prompt Composer page:

1. Set **Output Settings** (aspect ratio, output mode, framing)
2. Write your **Scene Heart** (one frozen moment)
3. Select **Cast Members** and bind **Wardrobes** to each
4. Choose a **Look** and **Lens Mode**
5. Add **Environment Anchors** (3-5 specific objects)
6. Write **Mechanic Lock** (cause → effect) and **Focus Target**
7. Select **Micro Packs** for texture and detail richness

The live preview updates as you make changes. When satisfied, click **Copy Prompt**.

### 3. Output Modes

- **Compact** - Concise format with all sections
- **Expanded (5-Star)** - Detailed format with explicit section headers

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Cloud Storage**: Azure Blob Storage
- **Local Storage**: localStorage (fallback/backup)
- **AI**: OpenRouter API (optional)

## Project Data Structure

Each project is stored as a JSON file with the following structure:

```json
{
  "id": "proj_abc123",
  "name": "My Project Name",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T12:30:00.000Z",
  "prompts": [
    {
      "id": "prompt_xyz789",
      "title": "Scene 1 - Kitchen",
      "promptRequest": {
        "aspectRatio": "3x2",
        "outputMode": "compact",
        "sceneHeart": "A tabby cat chef...",
        "cast": [...],
        "framing": "medium",
        "lensMode": "auto",
        "lookFamilyId": "...",
        "environmentAnchors": ["copper pots", "wooden spoon", ...],
        "mechanicLock": "Steam rising from pot...",
        "focusTarget": "Cat's face and paws...",
        "selectedMicroTextures": [...],
        "selectedMicroDetails": [...]
      },
      "createdAt": "2024-01-10T00:00:00.000Z",
      "updatedAt": "2024-01-15T12:30:00.000Z",
      "history": [
        {
          "id": "hist_001",
          "promptRequest": {...},
          "savedAt": "2024-01-14T10:00:00.000Z",
          "note": "Before major changes"
        }
      ]
    }
  ]
}
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Project/Prompt Composer (main entry)
│   ├── characters/page.tsx   # Character Manager
│   ├── wardrobes/page.tsx    # Wardrobe Manager
│   ├── looks/page.tsx        # Look Manager
│   ├── lenses/page.tsx       # Lens Manager
│   ├── micro-packs/page.tsx  # Micro Packs Manager
│   └── api/
│       ├── ai/               # AI suggestion endpoints
│       └── projects/         # Azure Blob Storage API
│           ├── route.ts      # GET/POST /api/projects
│           └── [id]/
│               └── route.ts  # GET/PUT/DELETE /api/projects/[id]
├── components/
│   ├── projects-list.tsx     # Projects grid view
│   ├── prompts-list.tsx      # Prompts sidebar
│   ├── prompt-history.tsx    # Collapsible history with restore
│   └── ...                   # Other UI components
├── hooks/
│   └── useProject.ts         # Project management hook with auto-save
├── lib/
│   ├── azure-storage.ts      # Azure Blob Storage client
│   ├── schemas.ts            # Zod schemas and types
│   ├── storage.ts            # localStorage CRUD (library data)
│   ├── compiler.ts           # Prompt compilation
│   └── ai-client.ts          # AI client
└── data/
    └── defaults.ts           # Seeded default data
```

## Data Export/Import

Export your entire library or individual prompt drafts as JSON:

- **Export All**: Downloads all characters, wardrobes, looks, lenses, micro packs
- **Export Prompt**: Downloads current prompt request only
- **Import**: Merges imported data with existing (doesn't overwrite)

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

ISC License

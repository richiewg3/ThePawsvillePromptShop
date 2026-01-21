# The Pawsville Prompt Shop

A structured prompt compiler for Sora (and similar) image generation. Build deterministic, well-organized prompts for anthropomorphic character scenes with a beautiful, intuitive interface.

## Features

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
- **Local-First Storage** - All data stored in browser localStorage
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
- **Storage**: localStorage (local-first)
- **AI**: OpenRouter API (optional)

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Prompt Composer
│   ├── characters/page.tsx   # Character Manager
│   ├── wardrobes/page.tsx    # Wardrobe Manager
│   ├── looks/page.tsx        # Look Manager
│   ├── lenses/page.tsx       # Lens Manager
│   ├── micro-packs/page.tsx  # Micro Packs Manager
│   └── api/ai/               # AI suggestion endpoints
├── components/               # Reusable UI components
├── lib/
│   ├── schemas.ts            # Zod schemas and types
│   ├── storage.ts            # localStorage CRUD
│   ├── compiler.ts           # Prompt compilation
│   └── openrouter.ts         # AI client
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

import {
  BlobServiceClient,
  ContainerClient,
} from "@azure/storage-blob";
import {
  CharacterProfile,
  WardrobeProfile,
  LensProfile,
  LookFamily,
  MicroTexturePack,
  MicroDetailPack,
  PromptRequest,
} from "./schemas";
import {
  defaultLookFamilies,
  defaultLensProfiles,
  defaultMicroTexturePacks,
  defaultMicroDetailPacks,
} from "@/data/defaults";

// ============================================
// AZURE BLOB STORAGE CLIENT
// ============================================

const CONTAINER_NAME = "pawsvillepromptshop";
const PROJECTS_PREFIX = "projects/";

let containerClient: ContainerClient | null = null;

/**
 * Initialize the Azure Blob Storage container client
 */
function getContainerClient(): ContainerClient | null {
  if (containerClient) return containerClient;

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    console.warn("AZURE_STORAGE_CONNECTION_STRING not configured - using fallback mode");
    return null;
  }

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    return containerClient;
  } catch (error) {
    console.error("Failed to initialize Azure Blob Storage client:", error);
    return null;
  }
}

/**
 * Check if Azure Storage is available
 */
export function isAzureStorageAvailable(): boolean {
  return !!process.env.AZURE_STORAGE_CONNECTION_STRING;
}

// ============================================
// PROJECT TYPES - COMPLETE PROJECT DATA
// ============================================

export interface PromptHistoryEntry {
  id: string;
  promptRequest: Partial<PromptRequest>;
  savedAt: string;
  note?: string;
}

export interface ProjectPrompt {
  id: string;
  title: string;
  promptRequest: Partial<PromptRequest>;
  createdAt: string;
  updatedAt: string;
  history: PromptHistoryEntry[];
}

/**
 * Complete Project structure containing ALL data.
 * When you save a project, EVERYTHING is saved to Azure.
 * When you load a project, EVERYTHING is loaded from Azure.
 */
export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  
  // ALL project data - saved to Azure
  characters: CharacterProfile[];
  wardrobes: WardrobeProfile[];
  lenses: LensProfile[];
  looks: LookFamily[];
  microTextures: MicroTexturePack[];
  microDetails: MicroDetailPack[];
  prompts: ProjectPrompt[];
}

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListItem extends ProjectMetadata {
  promptCount: number;
  characterCount: number;
  wardrobeCount: number;
}

// ============================================
// PROJECT OPERATIONS
// ============================================

/**
 * List all projects from Azure Blob Storage
 */
export async function listProjects(): Promise<ProjectListItem[]> {
  const client = getContainerClient();
  if (!client) {
    return [];
  }

  const projects: ProjectListItem[] = [];

  try {
    // Ensure container exists
    await client.createIfNotExists();

    // List all blobs with the projects/ prefix
    for await (const blob of client.listBlobsFlat({ prefix: PROJECTS_PREFIX })) {
      if (blob.name.endsWith(".json")) {
        try {
          const blobClient = client.getBlobClient(blob.name);
          const downloadResponse = await blobClient.download();
          const content = await streamToString(downloadResponse.readableStreamBody!);
          const project = JSON.parse(content) as Project;
          
          projects.push({
            id: project.id,
            name: project.name,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            promptCount: project.prompts?.length || 0,
            characterCount: project.characters?.length || 0,
            wardrobeCount: project.wardrobes?.length || 0,
          });
        } catch (e) {
          console.error(`Error reading project ${blob.name}:`, e);
        }
      }
    }

    // Sort by updatedAt descending (most recent first)
    projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    console.error("Error listing projects:", error);
    throw error;
  }

  return projects;
}

/**
 * Get a single project by ID - returns COMPLETE project with ALL data
 */
export async function getProject(projectId: string): Promise<Project | null> {
  const client = getContainerClient();
  if (!client) {
    return null;
  }

  try {
    const blobName = `${PROJECTS_PREFIX}${projectId}.json`;
    const blobClient = client.getBlobClient(blobName);
    
    const exists = await blobClient.exists();
    if (!exists) {
      return null;
    }

    const downloadResponse = await blobClient.download();
    const content = await streamToString(downloadResponse.readableStreamBody!);
    const project = JSON.parse(content) as Project;
    
    // Ensure all arrays exist (for backwards compatibility with old data)
    return {
      ...project,
      characters: project.characters || [],
      wardrobes: project.wardrobes || [],
      lenses: project.lenses || defaultLensProfiles,
      looks: project.looks || defaultLookFamilies,
      microTextures: project.microTextures || defaultMicroTexturePacks,
      microDetails: project.microDetails || defaultMicroDetailPacks,
      prompts: project.prompts || [],
    };
  } catch (error) {
    console.error(`Error getting project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Save a COMPLETE project to Azure Blob Storage
 * This saves ALL data: characters, wardrobes, lenses, looks, microTextures, microDetails, prompts
 */
export async function saveProject(project: Project): Promise<void> {
  const client = getContainerClient();
  if (!client) {
    throw new Error("Azure Storage not available");
  }

  try {
    // Ensure container exists
    await client.createIfNotExists();

    const blobName = `${PROJECTS_PREFIX}${project.id}.json`;
    const blockBlobClient = client.getBlockBlobClient(blobName);
    
    const content = JSON.stringify(project, null, 2);
    await blockBlobClient.upload(content, content.length, {
      blobHTTPHeaders: {
        blobContentType: "application/json",
      },
    });
    
    console.log(`[Azure] Saved project ${project.id} with ${project.characters.length} characters, ${project.wardrobes.length} wardrobes, ${project.prompts.length} prompts`);
  } catch (error) {
    console.error(`Error saving project ${project.id}:`, error);
    throw error;
  }
}

/**
 * Delete a project from Azure Blob Storage
 */
export async function deleteProject(projectId: string): Promise<void> {
  const client = getContainerClient();
  if (!client) {
    throw new Error("Azure Storage not available");
  }

  try {
    const blobName = `${PROJECTS_PREFIX}${projectId}.json`;
    const blockBlobClient = client.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
  } catch (error) {
    console.error(`Error deleting project ${projectId}:`, error);
    throw error;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert a readable stream to string
 */
async function streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    readableStream.on("data", (data) => {
      chunks.push(Buffer.from(data));
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    readableStream.on("error", reject);
  });
}

// ============================================
// PROJECT FACTORY FUNCTIONS
// ============================================

/**
 * Create a new empty project with default data
 * Characters and wardrobes start empty - user creates them
 * Looks, lenses, micro packs are pre-seeded with defaults
 */
export function createNewProject(name: string): Project {
  const now = new Date().toISOString();
  return {
    id: `proj_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    name,
    createdAt: now,
    updatedAt: now,
    // Empty - user creates these
    characters: [],
    wardrobes: [],
    // Pre-seeded with defaults
    lenses: defaultLensProfiles.map(l => ({ ...l, id: crypto.randomUUID() })),
    looks: defaultLookFamilies.map(l => ({ ...l, id: crypto.randomUUID() })),
    microTextures: defaultMicroTexturePacks.map(m => ({ ...m, id: crypto.randomUUID() })),
    microDetails: defaultMicroDetailPacks.map(m => ({ ...m, id: crypto.randomUUID() })),
    // Empty prompts
    prompts: [],
  };
}

/**
 * Create a new prompt within a project
 */
export function createNewPrompt(title: string): ProjectPrompt {
  const now = new Date().toISOString();
  return {
    id: `prompt_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    title,
    promptRequest: {},
    createdAt: now,
    updatedAt: now,
    history: [],
  };
}

/**
 * Add a history entry to a prompt
 */
export function addHistoryEntry(
  prompt: ProjectPrompt,
  note?: string
): PromptHistoryEntry {
  const entry: PromptHistoryEntry = {
    id: `hist_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    promptRequest: { ...prompt.promptRequest },
    savedAt: new Date().toISOString(),
    note,
  };
  prompt.history.unshift(entry); // Add to beginning (most recent first)
  
  // Keep only last 50 history entries
  if (prompt.history.length > 50) {
    prompt.history = prompt.history.slice(0, 50);
  }
  
  return entry;
}

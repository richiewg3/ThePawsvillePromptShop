import { NextRequest, NextResponse } from "next/server";
import {
  listProjects,
  saveProject,
  createNewProject,
  isAzureStorageAvailable,
} from "@/lib/azure-storage";

/**
 * GET /api/projects
 * List all projects
 */
export async function GET() {
  try {
    if (!isAzureStorageAvailable()) {
      return NextResponse.json({
        ok: true,
        data: {
          projects: [],
          storageMode: "local",
        },
      });
    }

    const projects = await listProjects();
    return NextResponse.json({
      ok: true,
      data: {
        projects,
        storageMode: "azure",
      },
    });
  } catch (error) {
    console.error("Error listing projects:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to list projects",
          code: "LIST_PROJECTS_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "Project name is required",
            code: "INVALID_NAME",
          },
        },
        { status: 400 }
      );
    }

    if (!isAzureStorageAvailable()) {
      // Return a new project for local storage mode
      const project = createNewProject(name.trim());
      return NextResponse.json({
        ok: true,
        data: {
          project,
          storageMode: "local",
        },
      });
    }

    const project = createNewProject(name.trim());
    await saveProject(project);

    return NextResponse.json({
      ok: true,
      data: {
        project,
        storageMode: "azure",
      },
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to create project",
          code: "CREATE_PROJECT_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

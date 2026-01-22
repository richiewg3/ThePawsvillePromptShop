import { NextRequest, NextResponse } from "next/server";
import {
  getProject,
  saveProject,
  deleteProject,
  isAzureStorageAvailable,
  Project,
} from "@/lib/azure-storage";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]
 * Get a single project by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isAzureStorageAvailable()) {
      return NextResponse.json({
        ok: true,
        data: {
          project: null,
          storageMode: "local",
        },
      });
    }

    const project = await getProject(id);
    
    if (!project) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "Project not found",
            code: "PROJECT_NOT_FOUND",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        project,
        storageMode: "azure",
      },
    });
  } catch (error) {
    console.error("Error getting project:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to get project",
          code: "GET_PROJECT_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]
 * Update a project
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { project } = body as { project: Project };

    if (!project) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "Project data is required",
            code: "INVALID_PROJECT",
          },
        },
        { status: 400 }
      );
    }

    // Ensure ID matches
    if (project.id !== id) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "Project ID mismatch",
            code: "ID_MISMATCH",
          },
        },
        { status: 400 }
      );
    }

    if (!isAzureStorageAvailable()) {
      return NextResponse.json({
        ok: true,
        data: {
          project,
          storageMode: "local",
        },
      });
    }

    // Update the updatedAt timestamp
    project.updatedAt = new Date().toISOString();
    
    await saveProject(project);

    return NextResponse.json({
      ok: true,
      data: {
        project,
        storageMode: "azure",
      },
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to update project",
          code: "UPDATE_PROJECT_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Delete a project
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isAzureStorageAvailable()) {
      return NextResponse.json({
        ok: true,
        data: {
          deleted: true,
          storageMode: "local",
        },
      });
    }

    await deleteProject(id);

    return NextResponse.json({
      ok: true,
      data: {
        deleted: true,
        storageMode: "azure",
      },
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to delete project",
          code: "DELETE_PROJECT_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

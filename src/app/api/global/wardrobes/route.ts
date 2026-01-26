import { NextRequest, NextResponse } from "next/server";
import {
  getGlobalWardrobes,
  saveGlobalWardrobes,
  isAzureStorageAvailable,
} from "@/lib/azure-storage";
import { WardrobeProfile } from "@/lib/schemas";

export async function GET() {
  try {
    if (!isAzureStorageAvailable()) {
      return NextResponse.json({
        ok: true,
        data: {
          items: [],
          storageMode: "local",
        },
      });
    }

    const items = await getGlobalWardrobes();
    return NextResponse.json({
      ok: true,
      data: {
        items,
        storageMode: "azure",
      },
    });
  } catch (error) {
    console.error("Error fetching global wardrobes:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to fetch global wardrobes",
          code: "GLOBAL_WARDROBES_GET_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAzureStorageAvailable()) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "Cloud storage not configured",
            code: "AZURE_NOT_CONFIGURED",
          },
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { items } = body as { items?: WardrobeProfile[] };

    if (!Array.isArray(items)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: "items array is required",
            code: "INVALID_ITEMS",
          },
        },
        { status: 400 }
      );
    }

    await saveGlobalWardrobes(items);
    return NextResponse.json({ ok: true, data: { items } });
  } catch (error) {
    console.error("Error saving global wardrobes:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message: error instanceof Error ? error.message : "Failed to save global wardrobes",
          code: "GLOBAL_WARDROBES_SAVE_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

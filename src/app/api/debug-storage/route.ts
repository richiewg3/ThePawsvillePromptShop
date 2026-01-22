import { NextResponse } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";

const CONTAINER_NAME = "pawsvillepromptshop";

/**
 * GET /api/debug-storage
 * Debug endpoint to test Azure Blob Storage connectivity
 */
export async function GET() {
  const results: {
    step: string;
    status: "success" | "error" | "skipped";
    message: string;
    details?: unknown;
  }[] = [];

  // Step 1: Check if connection string exists
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (!connectionString) {
    results.push({
      step: "1. Check Connection String",
      status: "error",
      message: "AZURE_STORAGE_CONNECTION_STRING is NOT set in environment variables",
      details: {
        hint: "Add AZURE_STORAGE_CONNECTION_STRING to your .env.local file",
        envVarsPresent: Object.keys(process.env).filter(k => k.includes("AZURE")).join(", ") || "None with 'AZURE' in name",
      }
    });
    
    return NextResponse.json({
      ok: false,
      message: "Azure Storage not configured",
      results,
    });
  }

  // Mask the connection string for display
  const maskedConnectionString = connectionString.replace(
    /AccountKey=([^;]+)/,
    "AccountKey=****HIDDEN****"
  );
  
  results.push({
    step: "1. Check Connection String",
    status: "success",
    message: "Connection string IS configured",
    details: {
      maskedConnectionString,
      length: connectionString.length,
    }
  });

  // Step 2: Try to create BlobServiceClient
  let blobServiceClient: BlobServiceClient;
  try {
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    results.push({
      step: "2. Create BlobServiceClient",
      status: "success",
      message: "BlobServiceClient created successfully",
      details: {
        accountName: blobServiceClient.accountName,
        url: blobServiceClient.url,
      }
    });
  } catch (error) {
    results.push({
      step: "2. Create BlobServiceClient",
      status: "error",
      message: "Failed to create BlobServiceClient",
      details: {
        error: error instanceof Error ? error.message : String(error),
        hint: "Check if your connection string format is correct"
      }
    });
    
    return NextResponse.json({
      ok: false,
      message: "Failed to connect to Azure Storage",
      results,
    });
  }

  // Step 3: Get container client and check/create container
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  
  try {
    const exists = await containerClient.exists();
    if (exists) {
      results.push({
        step: "3. Check Container",
        status: "success",
        message: `Container "${CONTAINER_NAME}" EXISTS`,
        details: { containerName: CONTAINER_NAME }
      });
    } else {
      // Try to create the container
      try {
        await containerClient.create();
        results.push({
          step: "3. Check/Create Container",
          status: "success",
          message: `Container "${CONTAINER_NAME}" was CREATED`,
          details: { containerName: CONTAINER_NAME }
        });
      } catch (createError) {
        results.push({
          step: "3. Create Container",
          status: "error",
          message: `Container "${CONTAINER_NAME}" does not exist and could not be created`,
          details: {
            error: createError instanceof Error ? createError.message : String(createError),
            hint: "Check if you have permissions to create containers"
          }
        });
        
        return NextResponse.json({
          ok: false,
          message: "Container issue",
          results,
        });
      }
    }
  } catch (error) {
    results.push({
      step: "3. Check Container",
      status: "error",
      message: "Failed to check if container exists",
      details: {
        error: error instanceof Error ? error.message : String(error),
        hint: "Check network connectivity and credentials"
      }
    });
    
    return NextResponse.json({
      ok: false,
      message: "Failed to access container",
      results,
    });
  }

  // Step 4: Try to write a test file
  const testBlobName = "debug-test/test-file.json";
  const testContent = JSON.stringify({
    test: true,
    timestamp: new Date().toISOString(),
    message: "If you can see this file in Azure, storage is working!"
  }, null, 2);

  try {
    const blockBlobClient = containerClient.getBlockBlobClient(testBlobName);
    await blockBlobClient.upload(testContent, testContent.length, {
      blobHTTPHeaders: {
        blobContentType: "application/json",
      },
    });
    
    results.push({
      step: "4. Write Test File",
      status: "success",
      message: `Successfully wrote test file to "${testBlobName}"`,
      details: {
        blobName: testBlobName,
        contentLength: testContent.length,
        url: blockBlobClient.url,
      }
    });
  } catch (error) {
    results.push({
      step: "4. Write Test File",
      status: "error",
      message: "Failed to write test file",
      details: {
        error: error instanceof Error ? error.message : String(error),
        hint: "Check write permissions on the container"
      }
    });
    
    return NextResponse.json({
      ok: false,
      message: "Cannot write to storage",
      results,
    });
  }

  // Step 5: Try to read the test file back
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(testBlobName);
    const downloadResponse = await blockBlobClient.download();
    
    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    const readContent = Buffer.concat(chunks).toString("utf8");
    
    results.push({
      step: "5. Read Test File",
      status: "success",
      message: "Successfully read test file back",
      details: {
        content: JSON.parse(readContent),
      }
    });
  } catch (error) {
    results.push({
      step: "5. Read Test File",
      status: "error",
      message: "Failed to read test file",
      details: {
        error: error instanceof Error ? error.message : String(error),
      }
    });
  }

  // Step 6: List existing projects
  try {
    const projectFiles: string[] = [];
    for await (const blob of containerClient.listBlobsFlat({ prefix: "projects/" })) {
      projectFiles.push(blob.name);
    }
    
    results.push({
      step: "6. List Projects",
      status: "success",
      message: `Found ${projectFiles.length} project files`,
      details: {
        files: projectFiles,
      }
    });
  } catch (error) {
    results.push({
      step: "6. List Projects",
      status: "error",
      message: "Failed to list projects",
      details: {
        error: error instanceof Error ? error.message : String(error),
      }
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Azure Storage is working correctly!",
    results,
    instructions: {
      checkAzurePortal: `Go to Azure Portal → Storage Account → Containers → "${CONTAINER_NAME}" → You should see a "debug-test" folder with "test-file.json"`,
      projectsLocation: `Projects will be saved in the "projects/" folder`,
    }
  });
}

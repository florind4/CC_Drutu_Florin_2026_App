const { BlobServiceClient } = require("@azure/storage-blob");
const {
  authenticate,
  jsonResponseWithCorrelation,
  normalizeError,
  preflightResponse,
} = require("../shared/auth");
const { emit, finishRequest, maskDeviceId, startRequest } = require("../shared/logging");

// Helper to convert the downloaded Azure Blob stream into a readable string
async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", (data) => chunks.push(data.toString()));
    readableStream.on("end", () => resolve(chunks.join("")));
    readableStream.on("error", reject);
  });
}

// Connects to Azure Blob Storage, downloads sensor_data.csv, and parses it into JSON
async function getCsvDataFromAzure(context) {
  try {
    // These environment variables MUST be set in your Azure Container App
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.STORAGE_CONTAINER_NAME; 
    const blobName = "sensor_data.csv"; 

    if (!connectionString || !containerName) {
      context.log.error("Missing Azure Storage credentials in Environment Variables.");
      return []; // Return empty array so the app doesn't crash, just shows no data
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Download the file from Azure
    const downloadBlockBlobResponse = await blockBlobClient.download(0);
    const csvString = await streamToString(downloadBlockBlobResponse.readableStreamBody);

    // Parse the CSV String
    const lines = csvString.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) return []; // Needs at least a header row and one data row

    const headers = lines[0].split(',').map(h => h.trim());
    const results = [];

    // Map each row's values to the corresponding header
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ? values[index].trim() : "";
      });
      results.push(row);
    }
    
    return results;
  } catch (error) {
    context.log.error("Error fetching CSV from Azure Storage:", error.message);
    return [];
  }
}

module.exports = async function data(context, req) {
  const request = startRequest(context, req, "/api/data");

  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    context.res = preflightResponse(request.correlationId);
    finishRequest(context, request, 204);
    return;
  }

  try {
    // 2. Authenticate the User
    const auth = await authenticate(req);
    const { role, device_id } = auth.claims;

    // 3. Fetch Data from Azure Blob Storage
    const allData = await getCsvDataFromAzure(context);
    let visibleData;

    // 4. Role-Based Access Control (RBAC) Logic
    if (role === "admin") {
      // Admins get everything
      visibleData = allData;
    } else if (role === "user") {
      // Users must have a device_id claim
      if (!device_id) {
        emit(context, "warn", "authz.denied", {
          correlationId: request.correlationId,
          path: "/api/data",
          code: "missing_device_id",
          role,
        });
        context.res = jsonResponseWithCorrelation(403, { error: "No device_id associated with this account" }, request.correlationId);
        finishRequest(context, request, 403);
        return;
      }
      // Filter the data so they only see rows matching their device_id
      visibleData = allData.filter((item) => item.device_id === device_id);
    } else {
      // Unknown roles are blocked
      emit(context, "warn", "authz.denied", {
        correlationId: request.correlationId,
        path: "/api/data",
        code: "unknown_role",
        role,
      });
      context.res = jsonResponseWithCorrelation(403, { error: "Insufficient permissions" }, request.correlationId);
      finishRequest(context, request, 403);
      return;
    }

    // 5. Log Success and Return Data
    emit(context, "info", "authz.allowed", {
      correlationId: request.correlationId,
      path: "/api/data",
      role,
      deviceIdMasked: maskDeviceId(device_id),
      returnedCount: visibleData.length,
    });

    context.res = jsonResponseWithCorrelation(200, { role, device_id, data: visibleData }, request.correlationId);
    finishRequest(context, request, 200);

  } catch (error) {
    // 6. Handle Errors Gracefully
    const normalized = normalizeError(error);
    emit(context, normalized.status >= 500 ? "error" : "warn", "auth.failed", {
      correlationId: request.correlationId,
      path: "/api/data",
      code: normalized.code,
      reason: normalized.logMessage,
    });
    context.res = jsonResponseWithCorrelation(normalized.status, { error: normalized.clientMessage }, request.correlationId);
    finishRequest(context, request, normalized.status);
  }
};
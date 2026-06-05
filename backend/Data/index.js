const { BlobServiceClient } = require("@azure/storage-blob");
const { DefaultAzureCredential } = require("@azure/identity");
const {
  authenticate,
  jsonResponseWithCorrelation,
  normalizeError,
  preflightResponse,
} = require("../shared/auth");
const { emit, finishRequest, maskDeviceId, startRequest } = require("../shared/logging");

// Helper to convert the downloaded Azure Blob stream into a string
async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", (data) => chunks.push(data.toString()));
    readableStream.on("end", () => resolve(chunks.join("")));
    readableStream.on("error", reject);
  });
}

// Connects to Azure Blob Storage using your specific Environment Variables
async function getCsvDataFromAzure(context) {
  try {
    const accountUrl = process.env.AZURE_STORAGE_ACCOUNT_URL;
    const containerName = process.env.DATASETS_CONTAINER_NAME;
    const blobName = "sensor_data.csv";

    if (!accountUrl || !containerName) {
      context.log.error("Missing AZURE_STORAGE_ACCOUNT_URL or DATASETS_CONTAINER_NAME variables.");
      return [];
    }

    // DefaultAzureCredential automatically uses AZURE_CLIENT_ID from your environment variables
    const credential = new DefaultAzureCredential();
    const blobServiceClient = new BlobServiceClient(accountUrl, credential);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Download and read the CSV
    const downloadBlockBlobResponse = await blockBlobClient.download(0);
    const csvString = await streamToString(downloadBlockBlobResponse.readableStreamBody);

    // Parse the CSV String safely
    const lines = csvString.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) return []; 

    const headers = lines[0].split(',').map(h => h.trim());
    const results = [];

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

  if (req.method === "OPTIONS") {
    context.res = preflightResponse(request.correlationId);
    finishRequest(context, request, 204);
    return;
  }

  try {
    const auth = await authenticate(req);
    const { role, device_id } = auth.claims;

    // 1. Fetch CSV Data from Azure Blob Storage
    const allData = await getCsvDataFromAzure(context);
    let visibleData;

    // 2. Role-Based Access Control
    if (role === "admin") {
      visibleData = allData; // Admins get the full CSV dataset
    } else if (role === "user") {
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
      // Users get ONLY records matching their device_id
      visibleData = allData.filter((item) => item.device_id === device_id);
    } else {
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
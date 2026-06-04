const { DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");

const {
  authenticate,
  jsonResponseWithCorrelation,
  normalizeError,
  preflightResponse,
} = require("../shared/auth");
const { emit, finishRequest, maskDeviceId, startRequest } = require("../shared/logging");

module.exports = async function data(context, req) {
  const request = startRequest(context, req, "/api/data");

  // Handle CORS preflight requests securely
  if (req.method === "OPTIONS") {
    context.res = preflightResponse(request.correlationId);
    finishRequest(context, request, 204);
    return;
  }

  try {
    // Authenticate user via Cognito JWT
    const auth = await authenticate(req);
    const { role, device_id } = auth.claims;

    // --- AZURE STORAGE INTEGRATION START ---
    const accountUrl = process.env.AZURE_STORAGE_ACCOUNT_URL;
    if (!accountUrl) {
      throw new Error("AZURE_STORAGE_ACCOUNT_URL is missing in environment variables.");
    }

    // Connect using Managed Identity (No hardcoded passwords!)
    const credential = new DefaultAzureCredential();
    const blobServiceClient = new BlobServiceClient(accountUrl, credential);

    const containerClient = blobServiceClient.getContainerClient("datasets");
    const blobClient = containerClient.getBlobClient("sensor_data.csv");
    
    // Download and decode the CSV file
    const downloadResponse = await blobClient.downloadToBuffer();
    const csvString = downloadResponse.toString("utf-8");

    // Robust CSV Parsing (Handles both Windows \r\n and Linux \n line endings)
    const lines = csvString.split(/\r?\n/).filter((line) => line.trim() !== "");
    const headers = lines[0].split(",").map(h => h.trim());
    
    const allData = lines.slice(1).map((line) => {
      const values = line.split(",");
      let obj = {};
      headers.forEach((header, i) => {
        let val = values[i] ? values[i].trim() : "";
        // Convert telemetry to Numbers for the frontend, leave IDs/Timestamps as Strings
        obj[header] = isNaN(val) || val === "" ? val : Number(val);
      });
      return obj;
    });
    // --- AZURE STORAGE INTEGRATION END ---

    // --- ROLE-BASED ACCESS CONTROL (RBAC) ---
    let visibleData;

    if (role === "admin") {
      // Admins see all IoT devices
      visibleData = allData;
    } else if (role === "user") {
      // Users must have a designated device_id in their Cognito profile
      if (!device_id) {
        emit(context, "warn", "authz.denied", {
          correlationId: request.correlationId,
          path: "/api/data",
          code: "missing_device_id",
          role,
        });
        context.res = jsonResponseWithCorrelation(
          403,
          { error: "No device_id associated with this account" },
          request.correlationId
        );
        finishRequest(context, request, 403);
        return;
      }
      // Filter the cloud data down to just their device
      visibleData = allData.filter((item) => item.device_id === device_id);
    } else {
      // Unknown role fallback
      emit(context, "warn", "authz.denied", {
        correlationId: request.correlationId,
        path: "/api/data",
        code: "unknown_role",
        role,
      });
      context.res = jsonResponseWithCorrelation(
        403,
        { error: "Insufficient permissions" },
        request.correlationId
      );
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

    // Send the securely filtered JSON payload back to the React frontend
    context.res = jsonResponseWithCorrelation(
      200,
      {
        role,
        device_id,
        data: visibleData,
      },
      request.correlationId
    );
    finishRequest(context, request, 200);

  } catch (error) {
    const normalized = normalizeError(error);
    emit(context, normalized.status >= 500 ? "error" : "warn", "auth.failed", {
      correlationId: request.correlationId,
      path: "/api/data",
      code: normalized.code,
      reason: normalized.logMessage,
    });
    context.res = jsonResponseWithCorrelation(
      normalized.status,
      { error: normalized.clientMessage },
      request.correlationId
    );
    finishRequest(context, request, normalized.status);
  }
};
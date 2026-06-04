const { DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");
const { authenticate, jsonResponseWithCorrelation, normalizeError, preflightResponse } = require("../shared/auth");
const { emit, finishRequest, maskDeviceId, startRequest } = require("../shared/logging");

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

    const accountUrl = process.env.AZURE_STORAGE_ACCOUNT_URL;
    if (!accountUrl) throw new Error("AZURE_STORAGE_ACCOUNT_URL is missing");

    const credential = new DefaultAzureCredential();
    const blobServiceClient = new BlobServiceClient(accountUrl, credential);
    const containerClient = blobServiceClient.getContainerClient("datasets");
    const blobClient = containerClient.getBlobClient("sensor_data.csv");
    
    const downloadResponse = await blobClient.downloadToBuffer();
    const csvString = downloadResponse.toString("utf-8");

    const lines = csvString.split(/\r?\n/).filter((line) => line.trim() !== "");
    const headers = lines[0].split(",").map(h => h.trim());
    
    const allData = lines.slice(1).map((line) => {
      const values = line.split(",");
      let obj = {};
      headers.forEach((header, i) => {
        let val = values[i] ? values[i].trim() : "";
        obj[header] = isNaN(val) || val === "" ? val : Number(val);
      });
      return obj;
    });

    let visibleData;
    if (role === "admin") {
      visibleData = allData;
    } else if (role === "user") {
      if (!device_id) {
        context.res = jsonResponseWithCorrelation(403, { error: "No device_id" }, request.correlationId);
        finishRequest(context, request, 403);
        return;
      }
      visibleData = allData.filter((item) => item.device_id === device_id);
    } else {
      context.res = jsonResponseWithCorrelation(403, { error: "Insufficient permissions" }, request.correlationId);
      finishRequest(context, request, 403);
      return;
    }

    emit(context, "info", "authz.allowed", { correlationId: request.correlationId, path: "/api/data", role, returnedCount: visibleData.length });

    context.res = jsonResponseWithCorrelation(200, { role, device_id, data: visibleData }, request.correlationId);
    finishRequest(context, request, 200);
  } catch (error) {
    const normalized = normalizeError(error);
    context.res = jsonResponseWithCorrelation(normalized.status, { error: normalized.clientMessage }, request.correlationId);
    finishRequest(context, request, normalized.status);
  }
};
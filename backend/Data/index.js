const { BlobServiceClient } = require('@azure/storage-blob');
const csv = require('csv-parser');
const stream = require('stream');

// Endpoint to get telemetry data
app.get('/api/telemetry', async (req, res) => {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient('telemetry-data');
    const blobClient = containerClient.getBlobClient('telemetry.csv');

    // Download blob to a stream
    const downloadBlockBlobResponse = await blobClient.download(0);
    const csvData = [];

    downloadBlockBlobResponse.readableStreamBody
      .pipe(csv())
      .on('data', (row) => {
        // Parse numbers correctly
        csvData.push({
          timestamp: row.timestamp,
          deviceId: row.deviceId,
          temperature: parseFloat(row.temperature),
          powerLoad: parseFloat(row.powerLoad)
        });
      })
      .on('end', () => {
        // Dynamic security filtering based on user role (Lab02 requirement)
        const userRole = req.user?.role; // From your Cognito auth middleware
        const userDevice = req.user?.deviceId;

        let filteredData = csvData;
        if (userRole !== 'admin') {
          filteredData = csvData.filter(item => item.deviceId === userDevice);
        }

        res.json({ success: true, data: filteredData });
      });
  } catch (error) {
    console.error("Backend fetch error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
import React, { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { API_BASE, LOGOUT_URI, OIDC_CONFIG } from "./config";
import "./App.css";

const CHART_POINTS = 24;
const TABLE_POINTS = 50;

function normalizeReading(item) {
  const kwh = Number(item.kwh || 0);
  return {
    ...item,
    temperature: item.temperature != null && item.temperature !== ""
      ? Number(item.temperature)
      : Number((20 + kwh * 3.5).toFixed(1)),
    humidity: item.humidity != null && item.humidity !== ""
      ? Number(item.humidity)
      : Math.round(45 + kwh * 15),
    power_kw: item.power_kw != null && item.power_kw !== ""
      ? Number(item.power_kw)
      : kwh,
  };
}

function scopeTelemetryData(rawData, deviceId) {
  const latestDeviceId = [...rawData]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]?.device_id;
  const activeDeviceId = deviceId || latestDeviceId;
  const scoped = activeDeviceId
    ? rawData.filter((item) => item.device_id === activeDeviceId)
    : rawData;

  return [...scoped]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map(normalizeReading);
}

function TelemetryDashboard({ data, role, deviceId, loading, error }) {
  if (loading) {
    return <p className="muted">Loading live telemetry data...</p>;
  }

  if (error) {
    return <p className="telemetry-error">{error}</p>;
  }

  const chartData = data.slice(-CHART_POINTS);
  const tableData = data.slice(-TABLE_POINTS);
  const totalReadings = data.length;
  const avgTemp = totalReadings > 0
    ? (data.reduce((sum, item) => sum + Number(item.temperature || 0), 0) / totalReadings).toFixed(1)
    : 0;
  const totalPower = totalReadings > 0
    ? data.reduce((sum, item) => sum + Number(item.power_kw || 0), 0).toFixed(1)
    : 0;

  return (
    <div className="telemetry-dashboard">
      <header className="telemetry-header">
        <h2>IoT Device Telemetry Dashboard</h2>
        <p className="telemetry-meta">
          Logged in as: <strong>{role}</strong>
          {deviceId && <span> | Device Context: <strong>{deviceId}</strong></span>}
        </p>
      </header>

      <div className="telemetry-kpi-grid">
        <div className="telemetry-kpi telemetry-kpi-blue">
          <div className="telemetry-kpi-label">Active Records</div>
          <div className="telemetry-kpi-value">{totalReadings}</div>
        </div>
        <div className="telemetry-kpi telemetry-kpi-green">
          <div className="telemetry-kpi-label">Avg Temperature</div>
          <div className="telemetry-kpi-value">{avgTemp} °C</div>
        </div>
        <div className="telemetry-kpi telemetry-kpi-amber">
          <div className="telemetry-kpi-label">Accumulated Load</div>
          <div className="telemetry-kpi-value">{totalPower} kW</div>
        </div>
      </div>

      <div className="telemetry-charts-grid">
        <div className="telemetry-panel">
          <h3>Temperature Trajectory (°C)</h3>
          {chartData.length > 1 ? (
            <svg viewBox="0 0 500 200" className="telemetry-svg">
              <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="90" x2="480" y2="90" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="160" x2="480" y2="160" stroke="#cbd5e1" strokeWidth="1" />
              {(() => {
                const widthBetween = 440 / (chartData.length - 1);
                const points = chartData.map((d, idx) => {
                  const x = 40 + idx * widthBetween;
                  const temp = Number(d.temperature || 20);
                  const y = 160 - ((temp - 15) / 15) * 140;
                  return `${x},${y}`;
                }).join(" ");

                return (
                  <>
                    <polyline
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      points={points}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {chartData.map((d, idx) => {
                      const x = 40 + idx * widthBetween;
                      const temp = Number(d.temperature || 20);
                      const y = 160 - ((temp - 15) / 15) * 140;
                      return (
                        <g key={`${d.timestamp}-${idx}`}>
                          <circle cx={x} cy={y} r="4" fill="#3b82f6" />
                          <text x={x} y={y - 8} fontSize="9" textAnchor="middle" fill="#1e293b" fontWeight="600">
                            {temp}°C
                          </text>
                          <text x={x} y="180" fontSize="8" textAnchor="middle" fill="#94a3b8">
                            {new Date(d.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          ) : (
            <p className="telemetry-empty">Insufficient data points to render trend</p>
          )}
        </div>

        <div className="telemetry-panel">
          <h3>Power Profile per Reading (kW)</h3>
          {chartData.length > 0 ? (
            <svg viewBox="0 0 500 200" className="telemetry-svg">
              <line x1="40" y1="160" x2="480" y2="160" stroke="#cbd5e1" strokeWidth="1" />
              {(() => {
                const totalWidth = 440;
                const barWidth = Math.min(30, (totalWidth / chartData.length) * 0.5);
                const spacing = (totalWidth - barWidth * chartData.length) / (chartData.length + 1);
                const maxPower = Math.max(...chartData.map((d) => Number(d.power_kw || 0)), 0.1);

                return chartData.map((d, idx) => {
                  const x = 40 + spacing + idx * (barWidth + spacing);
                  const power = Number(d.power_kw || 0);
                  const barHeight = (power / maxPower) * 140;
                  const y = 160 - barHeight;

                  return (
                    <g key={`${d.timestamp}-${idx}`}>
                      <rect x={x} y={y} width={barWidth} height={barHeight} fill="#f59e0b" rx="2" />
                      <text x={x + barWidth / 2} y={y - 6} fontSize="9" textAnchor="middle" fill="#1e293b" fontWeight="600">
                        {power.toFixed(1)}
                      </text>
                      <text x={x + barWidth / 2} y="178" fontSize="8" textAnchor="middle" fill="#94a3b8">
                        {d.device_id}
                      </text>
                    </g>
                  );
                });
              })()}
            </svg>
          ) : (
            <p className="telemetry-empty">No telemetry data available</p>
          )}
        </div>
      </div>

      <div className="telemetry-panel">
        <h3>Raw Telemetry Log Container</h3>
        <div className="telemetry-table-wrap">
          <table className="telemetry-table">
            <thead>
              <tr>
                <th>Device ID</th>
                <th>Timestamp</th>
                <th>Temperature</th>
                <th>Humidity</th>
                <th>Power Load</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={`${row.timestamp}-${index}`}>
                  <td className="telemetry-device">{row.device_id}</td>
                  <td>{new Date(row.timestamp).toLocaleString()}</td>
                  <td>{row.temperature} °C</td>
                  <td>{row.humidity} %</td>
                  <td><span className="telemetry-power-badge">{row.power_kw} kW</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function App() {
  const auth = useAuth();
  const [profile, setProfile] = useState(null);
  const [dataResponse, setDataResponse] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");
  const [showToken, setShowToken] = useState(false);

  const idToken = auth.user?.id_token;
  const role = dataResponse?.role || "";
  const deviceId = dataResponse?.device_id || "";
  const telemetryData = scopeTelemetryData(dataResponse?.data || [], deviceId);

  useEffect(() => {
    if (!idToken) return;

    setLoadingProfile(true);
    fetch(`${API_BASE}/api/profile`, { headers: { Authorization: `Bearer ${idToken}` } })
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .finally(() => setLoadingProfile(false));

    setLoadingData(true);
    setDataError("");
    fetch(`${API_BASE}/api/data`, { headers: { Authorization: `Bearer ${idToken}` } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.json();
      })
      .then((data) => setDataResponse(data))
      .catch((err) => {
        console.error(err);
        setDataError("Failed to fetch data from cloud storage.");
      })
      .finally(() => setLoadingData(false));
  }, [idToken]);

  const userEmail = auth.user?.profile?.email || profile?.email || "user";

  const handleSignOut = () => {
    auth.signoutRedirect({
      extraQueryParams: {
        client_id: OIDC_CONFIG.client_id,
        logout_uri: LOGOUT_URI,
      },
    });
  };

  return (
    <div className="app-shell">
      <main className="app">
        <header className="hero">
          <h1>Cloud Computing App</h1>
        </header>

        {auth.isAuthenticated && (
          <div className="grid">
            <section className="card card-wide status-card">
              <p className="status-line">
                Logged in as <strong>{userEmail}</strong>
              </p>
              <button className="btn btn-secondary" onClick={handleSignOut}>
                Sign out
              </button>
            </section>

            <section className="card">
              <h2>Authentication Token</h2>
              <pre className="code-block">{showToken ? idToken : "••••••••••••••••••••"}</pre>
              <button className="btn btn-small btn-ghost" onClick={() => setShowToken(!showToken)}>
                {showToken ? "Hide" : "Show"}
              </button>
            </section>

            <section className="card">
              <h2>User Profile API Response</h2>
              {loadingProfile ? <p className="muted">Loading...</p> : <pre className="code-block">{JSON.stringify(profile, null, 2)}</pre>}
            </section>

            <section className="card card-wide">
              <h2>Data API Response</h2>
              {loadingData ? <p className="muted">Loading...</p> : <pre className="code-block" style={{ maxHeight: "300px", overflowY: "auto" }}>{JSON.stringify(dataResponse, null, 2)}</pre>}
            </section>

            <section className="card card-wide">
              <TelemetryDashboard
                data={telemetryData}
                role={role}
                deviceId={deviceId}
                loading={loadingData}
                error={dataError}
              />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

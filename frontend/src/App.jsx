import React, { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { API_BASE, LOGOUT_URI, OIDC_CONFIG } from "./config";
import "./App.css";

// Backend /api/data returns CSV rows from sensor_data.csv.
// Known columns: device_id, timestamp, kwh, location
const CHART_POINTS = 10;

function sortByTimestamp(rows) {
  return [...rows].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function pickChartSeries(rows, deviceId) {
  if (!rows.length) return [];

  let series = rows;
  if (deviceId) {
    series = rows.filter((row) => row.device_id === deviceId);
  } else {
    const latest = [...rows].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    if (latest?.device_id) {
      series = rows.filter((row) => row.device_id === latest.device_id);
    }
  }

  return sortByTimestamp(series).slice(-CHART_POINTS);
}

function TelemetryDashboard({ rows, role, deviceId, loading, error }) {
  if (loading) {
    return <p className="muted">Loading live telemetry data...</p>;
  }

  if (error) {
    return <p className="telemetry-error">{error}</p>;
  }

  if (!rows.length) {
    return (
      <p className="telemetry-empty">
        No telemetry rows returned for role <strong>{role || "unknown"}</strong>
        {deviceId ? <> and device <strong>{deviceId}</strong></> : null}.
      </p>
    );
  }

  const chartData = pickChartSeries(rows, deviceId);
  const tableData = sortByTimestamp(rows).slice(-50);
  const totalReadings = rows.length;
  const avgKwh = (rows.reduce((sum, row) => sum + Number(row.kwh || 0), 0) / totalReadings).toFixed(3);
  const totalKwh = rows.reduce((sum, row) => sum + Number(row.kwh || 0), 0).toFixed(1);
  const chartMaxKwh = Math.max(...chartData.map((row) => Number(row.kwh || 0)), 0.1);
  const chartMinKwh = Math.min(...chartData.map((row) => Number(row.kwh || 0)));
  const chartRange = chartMaxKwh - chartMinKwh || 1;

  return (
    <div className="telemetry-dashboard">
      <header className="telemetry-header">
        <h2>IoT Device Telemetry Dashboard</h2>
        <p className="telemetry-meta">
          Logged in as: <strong>{role}</strong>
          {deviceId ? <span> | Device Context: <strong>{deviceId}</strong></span> : null}
        </p>
      </header>

      <div className="telemetry-kpi-grid">
        <div className="telemetry-kpi telemetry-kpi-blue">
          <div className="telemetry-kpi-label">Active Records</div>
          <div className="telemetry-kpi-value">{totalReadings}</div>
        </div>
        <div className="telemetry-kpi telemetry-kpi-green">
          <div className="telemetry-kpi-label">Avg Energy</div>
          <div className="telemetry-kpi-value">{avgKwh} kWh</div>
        </div>
        <div className="telemetry-kpi telemetry-kpi-amber">
          <div className="telemetry-kpi-label">Total Energy</div>
          <div className="telemetry-kpi-value">{totalKwh} kWh</div>
        </div>
      </div>

      <div className="telemetry-charts-grid">
        <div className="telemetry-panel">
          <h3>Energy Trajectory (kWh)</h3>
          {chartData.length > 1 ? (
            <svg viewBox="0 0 500 200" className="telemetry-svg">
              <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="90" x2="480" y2="90" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="160" x2="480" y2="160" stroke="#cbd5e1" strokeWidth="1" />
              {(() => {
                const widthBetween = 440 / (chartData.length - 1);
                const points = chartData.map((row, idx) => {
                  const x = 40 + idx * widthBetween;
                  const kwh = Number(row.kwh || 0);
                  const y = 160 - ((kwh - chartMinKwh) / chartRange) * 140;
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
                    {chartData.map((row, idx) => {
                      const x = 40 + idx * widthBetween;
                      const kwh = Number(row.kwh || 0);
                      const y = 160 - ((kwh - chartMinKwh) / chartRange) * 140;
                      return (
                        <g key={`${row.timestamp}-${idx}`}>
                          <circle cx={x} cy={y} r="4" fill="#3b82f6" />
                          <text x={x} y={y - 8} fontSize="9" textAnchor="middle" fill="#1e293b" fontWeight="600">
                            {kwh}
                          </text>
                          <text x={x} y="180" fontSize="8" textAnchor="middle" fill="#94a3b8">
                            {new Date(row.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
          <h3>Energy Profile per Reading (kWh)</h3>
          {chartData.length > 0 ? (
            <svg viewBox="0 0 500 200" className="telemetry-svg">
              <line x1="40" y1="160" x2="480" y2="160" stroke="#cbd5e1" strokeWidth="1" />
              {(() => {
                const totalWidth = 440;
                const barWidth = Math.min(30, (totalWidth / chartData.length) * 0.5);
                const spacing = (totalWidth - barWidth * chartData.length) / (chartData.length + 1);

                return chartData.map((row, idx) => {
                  const x = 40 + spacing + idx * (barWidth + spacing);
                  const kwh = Number(row.kwh || 0);
                  const barHeight = (kwh / chartMaxKwh) * 140;
                  const y = 160 - barHeight;

                  return (
                    <g key={`${row.timestamp}-${idx}`}>
                      <rect x={x} y={y} width={barWidth} height={barHeight} fill="#f59e0b" rx="2" />
                      <text x={x + barWidth / 2} y={y - 6} fontSize="9" textAnchor="middle" fill="#1e293b" fontWeight="600">
                        {kwh}
                      </text>
                      <text x={x + barWidth / 2} y="178" fontSize="8" textAnchor="middle" fill="#94a3b8">
                        {row.device_id}
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
                <th>Energy (kWh)</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={`${row.timestamp}-${index}`}>
                  <td className="telemetry-device">{row.device_id}</td>
                  <td>{new Date(row.timestamp).toLocaleString()}</td>
                  <td><span className="telemetry-power-badge">{row.kwh} kWh</span></td>
                  <td>{row.location}</td>
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
  const rows = Array.isArray(dataResponse?.data) ? dataResponse.data : [];

  useEffect(() => {
    if (!idToken) return;

    setLoadingProfile(true);
    fetch(`${API_BASE}/api/profile`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Profile request failed (${res.status})`);
        return res.json();
      })
      .then((body) => setProfile(body))
      .catch((err) => console.error(err))
      .finally(() => setLoadingProfile(false));

    setLoadingData(true);
    setDataError("");
    fetch(`${API_BASE}/api/data`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body.error || `Data request failed (${res.status})`);
        }
        if (body.error) {
          throw new Error(body.error);
        }
        if (!Array.isArray(body.data)) {
          throw new Error("Backend response is missing a data array.");
        }
        setDataResponse(body);
      })
      .catch((err) => {
        console.error(err);
        setDataError(err.message || "Failed to fetch data from cloud storage.");
        setDataResponse(null);
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

  if (auth.isLoading) {
    return (
      <div className="app-shell">
        <main className="app">
          <p className="muted">Loading authentication...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="app">
        <header className="hero">
          <h1>Cloud Computing App</h1>
        </header>

        {!auth.isAuthenticated ? (
          <section className="status-panel">
            <p className="muted">Sign in to load telemetry from the backend.</p>
            <button className="btn" onClick={() => auth.signinRedirect()}>
              Sign in
            </button>
          </section>
        ) : (
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
                rows={rows}
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

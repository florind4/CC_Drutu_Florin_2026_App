import React, { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { API_BASE, LOGOUT_URI, OIDC_CONFIG } from "./config";
import "./App.css";

const CHART_POINTS = 10;

function getTemperature(item) {
  if (item.temperature != null && item.temperature !== "") return Number(item.temperature);
  return Number((20 + Number(item.kwh || 0) * 3.5).toFixed(1));
}

function getPowerKw(item) {
  if (item.power_kw != null && item.power_kw !== "") return Number(item.power_kw);
  return Number(item.kwh || 0);
}

function TelemetryLineChart({ title, data, getValue, formatValue }) {
  if (data.length === 0) {
    return (
      <div className="telemetry-chart">
        <h3 className="telemetry-chart-title">{title}</h3>
        <p className="telemetry-chart-empty">No readings available.</p>
      </div>
    );
  }

  const values = data.map(getValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const plotTop = 30;
  const plotBottom = 170;
  const plotHeight = plotBottom - plotTop;
  const plotLeft = 30;
  const plotRight = 470;
  const plotWidth = plotRight - plotLeft;

  const coords = values.map((value, idx) => {
    const x = plotLeft + (idx / Math.max(values.length - 1, 1)) * plotWidth;
    const y = plotBottom - ((value - min) / range) * plotHeight;
    return { x, y, label: formatValue(value) };
  });

  const linePoints = coords.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="telemetry-chart">
      <h3 className="telemetry-chart-title">{title}</h3>
      <svg viewBox="0 0 500 200" className="telemetry-chart-svg" role="img" aria-label={title}>
        <polyline className="telemetry-chart-line" points={linePoints} />
        {coords.map((point, idx) => (
          <g key={idx}>
            <circle className="telemetry-chart-dot" cx={point.x} cy={point.y} r="5" />
            <text className="telemetry-chart-label" x={point.x} y={point.y - 12} textAnchor="middle">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function App() {
  const auth = useAuth();
  const [profile, setProfile] = useState(null);
  const [dataResponse, setDataResponse] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [showToken, setShowToken] = useState(false);

  const idToken = auth.user?.id_token;
  const data = dataResponse?.data || [];
  const role = dataResponse?.role || '';
  const deviceId = dataResponse?.device_id || '';

  useEffect(() => {
    if (!idToken) return;
    
    setLoadingProfile(true);
    fetch(`${API_BASE}/api/profile`, { headers: { Authorization: `Bearer ${idToken}` } })
      .then(res => res.json()).then(data => setProfile(data)).finally(() => setLoadingProfile(false));

    setLoadingData(true);
    fetch(`${API_BASE}/api/data`, { headers: { Authorization: `Bearer ${idToken}` } })
      .then(res => res.json()).then(data => setDataResponse(data)).finally(() => setLoadingData(false));
  }, [idToken]);

  const userEmail = auth.user?.profile?.email || profile?.email || "user";
  const latestDeviceId = [...data].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]?.device_id;
  const activeDeviceId = deviceId || latestDeviceId;
  const scopedData = activeDeviceId ? data.filter((item) => item.device_id === activeDeviceId) : data;
  const chartData = [...scopedData]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(-CHART_POINTS);

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
              <button className="btn btn-small btn-ghost" onClick={() => setShowToken(!showToken)}>{showToken ? "Hide" : "Show"}</button>
            </section>

            <section className="card">
              <h2>User Profile API Response</h2>
              {loadingProfile ? <p className="muted">Loading...</p> : <pre className="code-block">{JSON.stringify(profile, null, 2)}</pre>}
            </section>

            <section className="card card-wide">
              <h2>Data API Response</h2>
              {loadingData ? <p className="muted">Loading...</p> : <pre className="code-block" style={{maxHeight: '300px', overflowY: 'auto'}}>{JSON.stringify(dataResponse, null, 2)}</pre>}
            </section>

            <section className="card card-wide">
              <h2>Telemetry Visualizer</h2>
              <div className="telemetry-grid">
                <TelemetryLineChart
                  title="Temperature Trajectory (°C)"
                  data={chartData}
                  getValue={getTemperature}
                  formatValue={(value) => value.toFixed(1)}
                />
                <TelemetryLineChart
                  title="Power Load (kW)"
                  data={chartData}
                  getValue={getPowerKw}
                  formatValue={(value) => value.toFixed(1)}
                />
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
export default App;
import React, { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { API_BASE, LOGOUT_URI, OIDC_CONFIG } from "./config";
import "./App.css";

// 1. TELEMETRY COMPONENT
function TelemetryDashboard({ rows, role, deviceId, loading, error }) {
  if (loading) return <p className="muted">Loading telemetry...</p>;
  if (error) return <p className="telemetry-error">Error: {error}</p>;
  if (!rows || rows.length === 0) return <p className="telemetry-empty">No telemetry data available.</p>;

  const totalReadings = rows.length;
  const avgKwh = (rows.reduce((sum, row) => sum + Number(row.kwh || 0), 0) / totalReadings).toFixed(3);
  const totalKwh = rows.reduce((sum, row) => sum + Number(row.kwh || 0), 0).toFixed(1);
  const chartMaxKwh = Math.max(...rows.map((row) => Number(row.kwh || 0)), 0.1);
  const chartMinKwh = Math.min(...rows.map((row) => Number(row.kwh || 0)));
  const chartRange = chartMaxKwh - chartMinKwh || 1;

  return (
    <div className="telemetry-dashboard">
      <header className="telemetry-header">
        <h2>IoT Device Telemetry Dashboard</h2>
        <p className="telemetry-meta">Logged in as: <strong>{role}</strong> {deviceId && <span> | Device: <strong>{deviceId}</strong></span>}</p>
      </header>
      <div className="telemetry-kpi-grid">
        <div className="telemetry-kpi telemetry-kpi-blue"><div className="telemetry-kpi-label">Active Records</div><div className="telemetry-kpi-value">{totalReadings}</div></div>
        <div className="telemetry-kpi telemetry-kpi-green"><div className="telemetry-kpi-label">Avg Energy</div><div className="telemetry-kpi-value">{avgKwh} kWh</div></div>
        <div className="telemetry-kpi telemetry-kpi-amber"><div className="telemetry-kpi-label">Total Energy</div><div className="telemetry-kpi-value">{totalKwh} kWh</div></div>
      </div>
      <div className="telemetry-charts-grid">
        <div className="telemetry-panel">
          <h3>Energy Trajectory (kWh)</h3>
          <svg viewBox="0 0 500 200" className="telemetry-svg">
            <line x1="40" y1="160" x2="480" y2="160" stroke="#cbd5e1" strokeWidth="1" />
            {(() => {
              const widthBetween = 440 / (rows.length - 1 || 1);
              const points = rows.map((row, idx) => `${40 + idx * widthBetween},${160 - ((Number(row.kwh || 0) - chartMinKwh) / chartRange) * 140}`).join(" ");
              return <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={points} />;
            })()}
          </svg>
        </div>
        <div className="telemetry-panel">
          <h3>Energy Profile (kWh)</h3>
          <svg viewBox="0 0 500 200" className="telemetry-svg">
            <line x1="40" y1="160" x2="480" y2="160" stroke="#cbd5e1" strokeWidth="1" />
            {rows.map((row, idx) => {
              const barWidth = 30;
              const x = 40 + idx * (barWidth + 10);
              const kwh = Number(row.kwh || 0);
              const barHeight = (kwh / chartMaxKwh) * 140;
              return <rect key={idx} x={x} y={160 - barHeight} width={barWidth} height={barHeight} fill="#f59e0b" rx="2" />;
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

// 2. MAIN APP COMPONENT
function App() {
  const auth = useAuth();
  const [profile, setProfile] = useState(null);
  const [dataResponse, setDataResponse] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");
  const [showToken, setShowToken] = useState(false);

  const idToken = auth.user?.id_token;

  useEffect(() => {
    if (!idToken) return;

    // Fetch Profile
    setLoadingProfile(true);
    fetch(`${API_BASE}/api/profile`, { headers: { Authorization: `Bearer ${idToken}` } })
      .then(res => res.json()).then(setProfile).catch(() => {}).finally(() => setLoadingProfile(false));

    // Robust Data Fetch
    setLoadingData(true);
    setDataError("");
    fetch(`${API_BASE}/api/data`, { headers: { Authorization: `Bearer ${idToken}` } })
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) throw new Error(`Backend Error: ${res.status}`);
        if (!text) return { data: [] };
        try { return JSON.parse(text); } 
        catch (e) { throw new Error("Backend returned invalid JSON."); }
      })
      .then(setDataResponse)
      .catch((err) => setDataError(err.message))
      .finally(() => setLoadingData(false));
  }, [idToken]);

  if (auth.isLoading) return <div className="app-shell"><main className="app"><p className="muted">Loading...</p></main></div>;

  return (
    <div className="app-shell">
      <main className="app">
        <header className="hero"><h1>Cloud Computing App</h1></header>
        {!auth.isAuthenticated ? (
          <section className="status-panel"><button className="btn" onClick={() => auth.signinRedirect()}>Sign in</button></section>
        ) : (
          <div className="grid">
            <section className="card card-wide status-card">
              <p>Logged in as <strong>{auth.user?.profile?.email}</strong></p>
              <button className="btn btn-secondary" onClick={() => auth.signoutRedirect({ extraQueryParams: { client_id: OIDC_CONFIG.client_id, logout_uri: LOGOUT_URI } })}>Sign out</button>
            </section>
            
            <section className="card">
              <h2>Auth Token</h2>
              <button className="btn btn-small btn-ghost" onClick={() => setShowToken(!showToken)}>{showToken ? "Hide" : "Show"}</button>
              <pre className="code-block" style={{marginTop: '10px'}}>{showToken ? idToken : "••••••••••••••••••••"}</pre>
            </section>
            
            <section className="card card-wide">
              <h2>Data API Response</h2>
              <pre className="code-block" style={{maxHeight: '200px', overflowY: 'auto'}}>{JSON.stringify(dataResponse, null, 2)}</pre>
            </section>
            
            <section className="card card-wide">
              <TelemetryDashboard 
                rows={Array.isArray(dataResponse?.data) ? dataResponse.data : []} 
                role={dataResponse?.role || ''} 
                deviceId={dataResponse?.device_id || ''} 
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
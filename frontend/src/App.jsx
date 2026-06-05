import React, { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { API_BASE, COGNITO_DOMAIN, LOGOUT_URI, OIDC_CONFIG } from "./config";
import "./App.css";

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

  const totalReadings = data.length;
  const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const chartData = sortedData.slice(-48);
  const maxKwh = chartData.length > 0 ? Math.max(...chartData.map((item) => Number(item.kwh || 0)), 0.1) : 1;
  const avgKwh = totalReadings > 0 ? (data.reduce((sum, item) => sum + Number(item.kwh || 0), 0) / totalReadings).toFixed(3) : "0";
  const totalKwh = totalReadings > 0 ? data.reduce((sum, item) => sum + Number(item.kwh || 0), 0).toFixed(1) : "0";
  const uniqueDevices = new Set(data.map((item) => item.device_id).filter(Boolean)).size;
  const location = data[0]?.location || "—";

  return (
    <div className="app-shell">
      <main className="app">
        <header className="hero">
          <h1>Cloud Computing App</h1>
        </header>

        {auth.isAuthenticated && (
          <div className="grid">
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

            {/* INTEGRATED DASHBOARD */}
            <section className="card card-wide">
              <header style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', color: '#1e293b' }}>IoT Device Telemetry Dashboard</h1>
                <p style={{ color: '#64748b' }}>
                  Logged in as: <strong>{role}</strong>
                  {deviceId && <span> | Device: <strong>{deviceId}</strong></span>}
                  {totalReadings > 0 && <span> | Location: <strong>{location}</strong></span>}
                  {role === "admin" && uniqueDevices > 0 && <span> | Devices: <strong>{uniqueDevices}</strong></span>}
                </p>
              </header>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Active Records</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{totalReadings}</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Avg Energy</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{avgKwh} kWh</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Energy</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{totalKwh} kWh</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
                <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3>Energy Trajectory (kWh)</h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 0 }}>Last {chartData.length} readings by timestamp</p>
                  {chartData.length > 1 ? (
                    <svg viewBox="0 0 500 200" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                      {(() => {
                        const widthBetween = 440 / (chartData.length - 1);
                        const points = chartData.map((item, idx) => {
                          const y = 160 - (Number(item.kwh || 0) / maxKwh) * 140;
                          return `${40 + idx * widthBetween},${y}`;
                        }).join(" ");
                        return <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={points} />;
                      })()}
                    </svg>
                  ) : (
                    <p className="muted">Not enough readings to plot a trajectory.</p>
                  )}
                </div>
                <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3>Energy Profile (kWh)</h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 0 }}>Hourly consumption for the same window</p>
                  {chartData.length > 0 ? (
                    <svg viewBox="0 0 500 200" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                      {chartData.map((item, idx) => {
                        const slotWidth = 440 / chartData.length;
                        const barWidth = Math.max(4, slotWidth - 2);
                        const h = (Number(item.kwh || 0) / maxKwh) * 140;
                        return (
                          <rect
                            key={`${item.timestamp}-${idx}`}
                            x={40 + idx * slotWidth}
                            y={160 - h}
                            width={barWidth}
                            height={h}
                            fill="#f59e0b"
                          />
                        );
                      })}
                    </svg>
                  ) : (
                    <p className="muted">No energy readings available.</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
export default App;
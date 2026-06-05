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
  const avgTemp = totalReadings > 0 ? (data.reduce((sum, item) => sum + Number(item.temperature || 0), 0) / totalReadings).toFixed(1) : 0;
  const totalPower = totalReadings > 0 ? data.reduce((sum, item) => sum + Number(item.power_kw || 0), 0).toFixed(1) : 0;

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
                <p style={{ color: '#64748b' }}>Logged in as: <strong>{role}</strong> {deviceId && <span>| Device: <strong>{deviceId}</strong></span>}</p>
              </header>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Active Records</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{totalReadings}</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Avg Temperature</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{avgTemp} °C</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Accumulated Load</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{totalPower} kW</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
                {/* Temp Chart */}
                <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3>Temperature Trajectory (°C)</h3>
                  <svg viewBox="0 0 500 200" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                    {data.length > 1 && (() => {
                      const widthBetween = 440 / (data.length - 1);
                      const points = data.map((d, idx) => `${40 + idx * widthBetween},${160 - ((Number(d.temperature || 20) - 15) / 15) * 140}`).join(' ');
                      return <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={points} />;
                    })()}
                  </svg>
                </div>
                {/* Power Chart */}
                <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3>Power Profile (kW)</h3>
                  <svg viewBox="0 0 500 200" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                    {data.map((d, idx) => {
                      const h = (Number(d.power_kw || 0) / 3) * 140;
                      return <rect key={idx} x={40 + idx * 50} y={160 - h} width="30" height={h} fill="#f59e0b" />;
                    })}
                  </svg>
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
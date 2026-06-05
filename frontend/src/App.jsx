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

  // Metrics for Dashboard
  const totalReadings = data.length;
  const avgTemp = totalReadings > 0 ? (data.reduce((sum, item) => sum + Number(item.temperature || 0), 0) / totalReadings).toFixed(1) : 0;
  const totalPower = totalReadings > 0 ? data.reduce((sum, item) => sum + Number(item.power_kw || 0), 0).toFixed(1) : 0;

  return (
    <div className="app-shell">
      <main className="app">
        <header className="hero">
          <h1>Cloud Computing App</h1>
        </header>

        <section className="card status-card">
          {auth.isAuthenticated ? (
            <>
              <p>Logged in as <strong>{auth.user?.profile?.email}</strong></p>
              <button className="btn btn-secondary" onClick={() => { auth.removeUser(); window.location.href = `${COGNITO_DOMAIN}/logout?client_id=${OIDC_CONFIG.client_id}&logout_uri=${encodeURIComponent(LOGOUT_URI)}`; }}>Sign out</button>
            </>
          ) : <button className="btn" onClick={() => auth.signinRedirect()}>Sign in</button>}
        </section>

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

            {/* DASHBOARD INTEGRATION */}
            <section className="card card-wide">
              <header style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem' }}>IoT Device Telemetry Dashboard</h1>
                <p>Logged in as: <strong>{role}</strong> {deviceId && <span>| Device: <strong>{deviceId}</strong></span>}</p>
              </header>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #3b82f6' }}>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Active Records</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{totalReadings}</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #10b981' }}>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Avg Temperature</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{avgTemp} °C</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Accumulated Load</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{totalPower} kW</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
                {/* Temperature Chart */}
                <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3>Temperature Trajectory</h3>
                  <svg viewBox="0 0 500 200" style={{ width: '100%' }}>
                    {data.map((d, i) => <circle key={i} cx={40 + i * 50} cy={160 - Number(d.temperature || 0)*2} r="5" fill="#3b82f6" />)}
                  </svg>
                </div>
                {/* Power Chart */}
                <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3>Power Profile (kW)</h3>
                  <svg viewBox="0 0 500 200" style={{ width: '100%' }}>
                    {data.map((d, i) => <rect key={i} x={40 + i * 50} y={160 - Number(d.power_kw || 0)*20} width="30" height={Number(d.power_kw || 0)*20} fill="#f59e0b" />)}
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
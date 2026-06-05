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
  const [copied, setCopied] = useState(false);

  const idToken = auth.user?.id_token;

  useEffect(() => {
    if (!idToken) return;
    setLoadingProfile(true);
    fetch(`${API_BASE}/api/profile`, { headers: { Authorization: `Bearer ${idToken}` } })
      .then(res => res.json()).then(data => setProfile(data)).finally(() => setLoadingProfile(false));

    setLoadingData(true);
    fetch(`${API_BASE}/api/data`, { headers: { Authorization: `Bearer ${idToken}` } })
      .then(res => res.json()).then(data => setDataResponse(data)).finally(() => setLoadingData(false));
  }, [idToken]);

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

            <section className="card card-wide">
              <h2>Advanced Telemetry Dashboard</h2>
              {dataResponse?.data?.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  {/* CHART 1: TEMPERATURE (Line) */}
                  <svg viewBox="0 0 500 220" style={{ width: '100%', backgroundColor: '#0f172a', borderRadius: '8px' }}>
                    {(() => {
                      const telemetry = dataResponse.data;
                      const vals = telemetry.map(d => Number(d.temperature || d.value || 0));
                      const max = Math.max(...vals) > 0 ? Math.max(...vals) : 100;
                      const min = Math.min(...vals) > 0 ? Math.min(...vals) * 0.8 : 0;
                      const range = (max - min) || 1;

                      return telemetry.map((d, i) => {
                        const val = Number(d.temperature || d.value || 0);
                        const x = 40 + i * (420 / (telemetry.length - 1 || 1));
                        const y = 180 - ((val - min) / range) * 140;
                        return <circle key={i} cx={x} cy={y} r="6" fill="#38bdf8" />;
                      });
                    })()}
                  </svg>
                  
                  {/* CHART 2: POWER (Bar) */}
                  <svg viewBox="0 0 500 220" style={{ width: '100%', backgroundColor: '#0f172a', borderRadius: '8px' }}>
                    {(() => {
                      const telemetry = dataResponse.data;
                      const vals = telemetry.map(d => Number(d.power_kw || d.power || d.value || 0));
                      const max = Math.max(...vals) > 0 ? Math.max(...vals) : 100;
                      
                      return telemetry.map((d, i) => {
                        const val = Number(d.power_kw || d.power || d.value || 0);
                        const h = (val / max) * 150;
                        const x = 40 + i * 50;
                        return <rect key={i} x={x} y={190 - h} width="30" height={h} fill="#10b981" rx="4" />;
                      });
                    })()}
                  </svg>
                </div>
              ) : <p className="muted">No data available.</p>}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
export default App;
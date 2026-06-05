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
        
        {/* Status Section */}
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
              {loadingProfile ? <p>Loading...</p> : <pre className="code-block">{JSON.stringify(profile, null, 2)}</pre>}
            </section>

            <section className="card card-wide">
              <h2>Data API Response</h2>
              {loadingData ? <p>Loading...</p> : <pre className="code-block" style={{maxHeight: '300px', overflowY: 'auto'}}>{JSON.stringify(dataResponse, null, 2)}</pre>}
            </section>

            {/* INTEGRATED GRAPHICS SECTION */}
            <section className="card card-wide">
              <h2>Advanced Telemetry Dashboard</h2>
              {dataResponse?.data?.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  {/* Temperature Chart */}
                  <svg viewBox="0 0 500 220" style={{ width: '100%', backgroundColor: '#0f172a', borderRadius: '8px' }}>
                    {dataResponse.data.map((d, i) => {
                      const val = Number(d.temperature || d.value || 0);
                      const x = 40 + i * 50;
                      const y = 160 - (val * 2);
                      return <circle key={i} cx={x} cy={y} r="6" fill="#38bdf8" />;
                    })}
                  </svg>
                  {/* Power Chart */}
                  <svg viewBox="0 0 500 220" style={{ width: '100%', backgroundColor: '#0f172a', borderRadius: '8px' }}>
                    {dataResponse.data.map((d, i) => {
                      const val = Number(d.power_kw || d.power || d.value || 0);
                      const x = 40 + i * 60;
                      return <rect key={i} x={x} y={160 - (val * 2)} width="30" height={val * 2} fill="#10b981" />;
                    })}
                  </svg>
                </div>
              ) : <p>No data available.</p>}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
export default App;
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
    if (!idToken) {
      setProfile(null);
      setDataResponse(null);
      return;
    }

    setError(null);

    // Fetch Profile
    setLoadingProfile(true);
    fetch(`${API_BASE}/api/profile`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingProfile(false));

    // Fetch Data
    setLoadingData(true);
    fetch(`${API_BASE}/api/data`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then((res) => res.json())
      .then((data) => setDataResponse(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingData(false));
  }, [idToken]);

  const signOutRedirect = () => {
    auth.removeUser();
    window.location.href = `${COGNITO_DOMAIN}/logout?client_id=${OIDC_CONFIG.client_id}&logout_uri=${encodeURIComponent(LOGOUT_URI)}`;
  };

  const copyToken = async () => {
    if (!idToken) return;
    try {
      await navigator.clipboard.writeText(idToken);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (e) { setError("Unable to copy token."); }
  };

  if (auth.isLoading) return <div className="app-shell"><div className="status-panel">Loading authentication...</div></div>;

  return (
    <div className="app-shell">
      <div className="bg-orb bg-orb-left" />
      <div className="bg-orb bg-orb-right" />
      <main className="app">
        <header className="hero">
          <p className="hero-kicker">Identity + Serverless</p>
          <h1>Cloud Computing App</h1>
        </header>

        {error && <div className="alert"><strong>Error:</strong> {error}</div>}

        <section className="card status-card">
          {auth.isAuthenticated ? (
            <>
              <p className="status-line"><span className="status-dot status-dot-online" />Logged in as <strong>{auth.user?.profile?.email}</strong></p>
              <button className="btn btn-secondary" onClick={signOutRedirect}>Sign out</button>
            </>
          ) : (
            <button className="btn" onClick={() => auth.signinRedirect()}>Sign in</button>
          )}
        </section>

        {auth.isAuthenticated && (
          <div className="grid">
            {/* Token Section */}
            <section className="card">
              <h2>Authentication Token</h2>
              <button className="btn btn-small btn-ghost" onClick={() => setShowToken(!showToken)}>{showToken ? "Hide" : "Show"}</button>
              <button className="btn btn-small btn-ghost" onClick={copyToken}>{copied ? "Copied" : "Copy"}</button>
              <pre className="code-block" style={{marginTop: '10px'}}>{showToken ? idToken : "••••••••••••••••••••"}</pre>
            </section>

            {/* Profile Section */}
            <section className="card">
              <h2>User Profile API Response</h2>
              {loadingProfile ? <p className="muted">Loading...</p> : <pre className="code-block">{JSON.stringify(profile, null, 2)}</pre>}
            </section>

            {/* Data API Response (Visible to Everyone) */}
            <section className="card card-wide">
              <h2>Data API Response</h2>
              {loadingData ? <p className="muted">Loading...</p> : <pre className="code-block" style={{maxHeight: '300px', overflowY: 'auto'}}>{JSON.stringify(dataResponse, null, 2)}</pre>}
            </section>

            {/* Telemetry Dashboard (Complex & Appealing) */}
            <section className="card card-wide">
              <h2>Advanced Telemetry Dashboard</h2>
              {dataResponse?.data?.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <svg viewBox="0 0 500 220" style={{ width: '100%', backgroundColor: '#0f172a', borderRadius: '8px', padding: '10px' }}>
                    <defs><linearGradient id="g1" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3"/><stop offset="100%" stopColor="#38bdf8" stopOpacity="0"/></linearGradient></defs>
                    {(() => {
                      const telemetry = dataResponse.data;
                      const vals = telemetry.map(d => Number(d.temperature || d.value || 0));
                      const min = Math.min(...vals) - 2; const range = (Math.max(...vals) - min) || 1;
                      const points = telemetry.map((d, i) => `${50 + i * (400 / (telemetry.length - 1 || 1))},${180 - ((Number(d.temperature || d.value || 0) - min) / range) * 120}`).join(' ');
                      return (
                        <>
                          <polygon points={`50,180 ${points} ${50 + (telemetry.length - 1) * (400 / (telemetry.length - 1 || 1))},180`} fill="url(#g1)" />
                          <polyline fill="none" stroke="#38bdf8" strokeWidth="3" points={points} />
                          {telemetry.map((d, i) => {
                            const val = Number(d.temperature || d.value || 0);
                            const x = 50 + i * (400 / (telemetry.length - 1 || 1));
                            const y = 180 - ((val - min) / range) * 120;
                            return <circle key={i} cx={x} cy={y} r="5" fill="#38bdf8" />;
                          })}
                        </>
                      );
                    })()}
                  </svg>
                  <svg viewBox="0 0 500 220" style={{ width: '100%', backgroundColor: '#0f172a', borderRadius: '8px', padding: '10px' }}>
                    {(() => {
                      const telemetry = dataResponse.data;
                      const max = Math.max(...telemetry.map(d => Number(d.power_kw || d.power || d.value || 0)), 1);
                      return telemetry.map((d, i) => {
                        const val = Number(d.power_kw || d.power || d.value || 0);
                        const h = (val / max) * 150;
                        return <rect key={i} x={50 + i * 50} y={180 - h} width="30" height={h} fill="#10b981" rx="4" />;
                      });
                    })()}
                  </svg>
                </div>
              ) : <p className="muted">No telemetry data available.</p>}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
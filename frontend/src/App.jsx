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

    setLoadingProfile(true);
    fetch(`${API_BASE}/api/profile`, { headers: { Authorization: `Bearer ${idToken}` } })
      .then((res) => res.json()).then((data) => setProfile(data))
      .catch((err) => setError(err.message)).finally(() => setLoadingProfile(false));

    setLoadingData(true);
    fetch(`${API_BASE}/api/data`, { headers: { Authorization: `Bearer ${idToken}` } })
      .then((res) => res.json()).then((data) => setDataResponse(data))
      .catch((err) => setError(err.message)).finally(() => setLoadingData(false));
  }, [idToken]);

  const signOutRedirect = () => {
    auth.removeUser();
    window.location.href = `${COGNITO_DOMAIN}/logout?client_id=${OIDC_CONFIG.client_id}&logout_uri=${encodeURIComponent(LOGOUT_URI)}`;
  };

  const copyToken = async () => {
    if (!idToken) return;
    await navigator.clipboard.writeText(idToken);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  if (auth.isLoading) return <div className="app-shell"><div className="status-panel">Loading...</div></div>;

  return (
    <div className="app-shell">
      <main className="app">
        <header className="hero">
          <p className="hero-kicker">Identity + Serverless</p>
          <h1>Cloud Computing App</h1>
          <p className="hero-subtitle">Secure frontend with Amazon Cognito authentication and Azure Functions APIs.</p>
        </header>

        {error && <div className="alert"><strong>Error:</strong> {error}</div>}

        <section className="card status-card">
          {auth.isAuthenticated ? (
            <>
              <p className="status-line">
                <span className="status-dot status-dot-online" />
                Logged in as <strong>{auth.user?.profile?.email}</strong>
              </p>
              <button className="btn btn-secondary" onClick={signOutRedirect}>Sign out</button>
            </>
          ) : (
            <button className="btn" onClick={() => auth.signinRedirect()}>Sign in</button>
          )}
        </section>

        {auth.isAuthenticated && (
          <div className="grid">
            <section className="card">
              <div className="section-head">
                <h2>Authentication Token</h2>
                <div className="actions">
                  <button className="btn btn-small btn-ghost" onClick={() => setShowToken(!showToken)}>{showToken ? "Hide" : "Show"}</button>
                  <button className="btn btn-small btn-ghost" onClick={copyToken}>{copied ? "Copied" : "Copy"}</button>
                </div>
              </div>
              <pre className="code-block">ID Token: {showToken ? idToken : "••••••••••••••••••••"}</pre>
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
                  <svg viewBox="0 0 500 220" style={{ width: '100%', backgroundColor: '#0f172a', borderRadius: '8px' }}>
                    {(() => {
                      const telemetry = dataResponse.data;
                      const temps = telemetry.map(d => Number(d.temperature || d.value || 0));
                      const min = Math.min(...temps) - 2;
                      const max = Math.max(...temps) + 2;
                      const range = max - min || 1;
                      return telemetry.map((d, i) => {
                        const val = Number(d.temperature || d.value || 0);
                        const x = 40 + i * (440 / (telemetry.length - 1 || 1));
                        const y = 180 - ((val - min) / range) * 140;
                        return <circle key={i} cx={x} cy={y} r="6" fill="#38bdf8" />;
                      });
                    })()}
                  </svg>
                  <svg viewBox="0 0 500 220" style={{ width: '100%', backgroundColor: '#0f172a', borderRadius: '8px' }}>
                    {(() => {
                      const telemetry = dataResponse.data;
                      const vals = telemetry.map(d => Number(d.power_kw || d.power || d.value || 0));
                      const max = Math.max(...vals, 1);
                      return telemetry.map((d, i) => {
                        const val = Number(d.power_kw || d.power || d.value || 0);
                        const barHeight = (val / max) * 150;
                        const x = 40 + i * (440 / (telemetry.length || 1));
                        return <rect key={i} x={x} y={180 - barHeight} width="30" height={barHeight} fill="#10b981" />;
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
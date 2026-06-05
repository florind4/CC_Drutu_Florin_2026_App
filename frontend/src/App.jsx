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
          <h1>Cloud Computing App</h1>
        </header>

        <section className="card status-card">
          {auth.isAuthenticated ? (
            <>
              <p>Logged in as <strong>{auth.user?.profile?.email}</strong></p>
              <button className="btn btn-secondary" onClick={signOutRedirect}>Sign out</button>
            </>
          ) : (
            <button className="btn" onClick={() => auth.signinRedirect()}>Sign in</button>
          )}
        </section>

        {auth.isAuthenticated && (
          <div className="grid">
            <section className="card">
              <h2>Authentication Token</h2>
              <pre className="code-block">{showToken ? idToken : "••••••••••••••••••••"}</pre>
              <button className="btn btn-small btn-ghost" onClick={() => setShowToken(!showToken)}>{showToken ? "Hide" : "Show"}</button>
              <button className="btn btn-small btn-ghost" onClick={copyToken}>{copied ? "Copied" : "Copy"}</button>
            </section>

            <section className="card">
              <h2>User Profile API Response</h2>
              {loadingProfile ? <p className="muted">Loading...</p> : <pre className="code-block">{JSON.stringify(profile, null, 2)}</pre>}
            </section>

            <section className="card card-wide">
              <h2>Data API Response</h2>
              {loadingData ? <p className="muted">Loading...</p> : <pre className="code-block">{JSON.stringify(dataResponse, null, 2)}</pre>}
            </section>

            <section className="card card-wide">
              <h2>Advanced Telemetry Dashboard</h2>
              {dataResponse?.data?.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  {/* Temperature Chart */}
                  <svg viewBox="0 0 500 220" style={{ width: '100%', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    {dataResponse.data.map((d, i) => (
                      <circle key={i} cx={40 + i * 50} cy={160 - d.value} r="5" fill="#38bdf8" />
                    ))}
                  </svg>
                  {/* Secondary Metric Chart */}
                  <svg viewBox="0 0 500 220" style={{ width: '100%', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    {dataResponse.data.map((d, i) => (
                      <rect key={i} x={40 + i * 60} y={160 - d.value} width="30" height={d.value} fill="#10b981" />
                    ))}
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
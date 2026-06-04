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

  // Call backend when we have an idToken
  useEffect(() => {
    if (!idToken) {
      setProfile(null);
      setDataResponse(null);
      return;
    }

    setError(null);

    // /api/profile
    setLoadingProfile(true);
    fetch(`${API_BASE}/api/profile`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error calling /api/profile");
        return res.json();
      })
      .then((data) => setProfile(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingProfile(false));

    // /api/data
    setLoadingData(true);
    fetch(`${API_BASE}/api/data`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error calling /api/data");
        return res.json();
      })
      .then((data) => setDataResponse(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingData(false));
  }, [idToken]);

  const signOutRedirect = () => {
    const clientId = OIDC_CONFIG.client_id;
    const logoutUri = LOGOUT_URI;
    const cognitoDomain = COGNITO_DOMAIN;

    // Clear local OIDC user (react-oidc-context)
    auth.removeUser();

    // Redirect to Cognito logout endpoint
    window.location.href =
      `${cognitoDomain}/logout?client_id=${clientId}` +
      `&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  const copyToken = async () => {
    if (!idToken) return;
    try {
      await navigator.clipboard.writeText(idToken);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (copyError) {
      setError("Unable to copy token to clipboard.");
    }
  };

  if (auth.isLoading) {
    return (
      <div className="app-shell">
        <div className="status-panel">Loading authentication...</div>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="app-shell">
        <div className="status-panel status-panel-error">
          Encountering error... {auth.error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="bg-orb bg-orb-left" />
      <div className="bg-orb bg-orb-right" />
      <main className="app">
        <header className="hero">
          <p className="hero-kicker">Identity + Serverless</p>
          <h1>Cloud Computing App</h1>
          <p className="hero-subtitle">
            Secure frontend with Amazon Cognito authentication and Azure Functions APIs.
          </p>
        </header>

        {error && (
          <div className="alert">
            <strong>Error:</strong> {error}
          </div>
        )}

        <section className="card status-card">
          {auth.isAuthenticated ? (
            <>
              <p className="status-line">
                <span className="status-dot status-dot-online" />
                Logged in as <strong>{auth.user?.profile?.email || "(no email claim)"}</strong>
              </p>
              <button className="btn btn-secondary" onClick={signOutRedirect}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <p className="status-line">
                <span className="status-dot" />
                Not logged in
              </p>
              <button className="btn" onClick={() => auth.signinRedirect()}>
                Sign in
              </button>
            </>
          )}
        </section>

        {auth.isAuthenticated && (
          <div className="grid">
            <section className="card">
              <div className="section-head">
                <h2>Authentication Token</h2>
                <div className="actions">
                  <button
                    className="btn btn-small btn-ghost"
                    onClick={() => setShowToken((current) => !current)}
                  >
                    {showToken ? "Hide" : "Show"}
                  </button>
                  <button className="btn btn-small btn-ghost" onClick={copyToken}>
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <pre className="code-block">
                ID Token: {showToken ? auth.user?.id_token : "••••••••••••••••••••"}
              </pre>
            </section>

            <section className="card">
              <h2>User Profile API Response</h2>
              {loadingProfile ? (
                <p className="muted">Loading profile...</p>
              ) : profile ? (
                <pre className="code-block">{JSON.stringify(profile, null, 2)}</pre>
              ) : (
                <p className="muted">No profile loaded yet.</p>
              )}
            </section>

            {/* --- VISUALIZER SECTION REPLACES RAW DATA DUMP --- */}
            <section className="card card-wide">
              <h2>Telemetry Visualizer</h2>
              {loadingData ? (
                <p className="muted">Loading real-time telemetry...</p>
              ) : dataResponse && dataResponse.data && dataResponse.data.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '1.5rem' }}>
                  
                  {/* Chart 1: Temperature Line Chart */}
                  <div>
                    <h4 style={{ color: '#94a3b8', marginBottom: '1rem', fontWeight: '500' }}>Temperature Trajectory (°C)</h4>
                    <svg viewBox="0 0 500 200" style={{ width: '100%', height: 'auto', backgroundColor: '#0f172a', borderRadius: '8px', padding: '10px' }}>
                      <line x1="40" y1="160" x2="480" y2="160" stroke="#334155" strokeWidth="2" />
                      {(() => {
                        const telemetry = dataResponse.data;
                        const widthBetween = 440 / (telemetry.length - 1 || 1);
                        const points = telemetry.map((d, idx) => {
                          const x = 40 + idx * widthBetween;
                          const temp = Number(d.temperature || 20);
                          const y = 160 - ((temp - 15) / 15) * 140; 
                          return `${x},${y}`;
                        }).join(' ');

                        return (
                          <>
                            <polyline fill="none" stroke="#38bdf8" strokeWidth="3" points={points} />
                            {telemetry.map((d, idx) => {
                              const x = 40 + idx * widthBetween;
                              const temp = Number(d.temperature || 20);
                              const y = 160 - ((temp - 15) / 15) * 140;
                              return (
                                <g key={idx}>
                                  <circle cx={x} cy={y} r="5" fill="#38bdf8" />
                                  <text x={x} y={y - 12} fontSize="12" textAnchor="middle" fill="#e2e8f0" fontWeight="bold">{temp}</text>
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  {/* Chart 2: Power Load Bar Chart */}
                  <div>
                    <h4 style={{ color: '#94a3b8', marginBottom: '1rem', fontWeight: '500' }}>Power Load (kW)</h4>
                    <svg viewBox="0 0 500 200" style={{ width: '100%', height: 'auto', backgroundColor: '#0f172a', borderRadius: '8px', padding: '10px' }}>
                      <line x1="40" y1="160" x2="480" y2="160" stroke="#334155" strokeWidth="2" />
                      {(() => {
                        const telemetry = dataResponse.data;
                        const totalWidth = 440;
                        const barWidth = Math.min(40, (totalWidth / telemetry.length) * 0.6);
                        const spacing = (totalWidth - (barWidth * telemetry.length)) / (telemetry.length + 1);

                        return telemetry.map((d, idx) => {
                          const x = 40 + spacing + idx * (barWidth + spacing);
                          const power = Number(d.power_kw || 0);
                          const barHeight = (power / 3) * 140; 
                          const y = 160 - barHeight;

                          return (
                            <g key={idx}>
                              <rect x={x} y={y} width={barWidth} height={barHeight} fill="#10b981" rx="4" />
                              <text x={x + barWidth / 2} y={y - 8} fontSize="12" textAnchor="middle" fill="#e2e8f0" fontWeight="bold">{power}</text>
                              <text x={x + barWidth / 2} y="180" fontSize="10" textAnchor="middle" fill="#64748b">{d.device_id}</text>
                            </g>
                          );
                        });
                      })()}
                    </svg>
                  </div>
                  
                </div>
              ) : (
                <p className="muted">No telemetry data available.</p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
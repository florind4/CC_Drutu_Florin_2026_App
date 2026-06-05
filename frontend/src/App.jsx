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
      .then((res) => {
        if (!res.ok) throw new Error("Error calling /api/profile");
        return res.json();
      })
      .then((data) => setProfile(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingProfile(false));

    // Fetch Data
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
    auth.removeUser();
    window.location.href =
      `${COGNITO_DOMAIN}/logout?client_id=${OIDC_CONFIG.client_id}` +
      `&logout_uri=${encodeURIComponent(LOGOUT_URI)}`;
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
    return <div className="app-shell"><div className="status-panel">Loading authentication...</div></div>;
  }

  return (
    <div className="app-shell">
      <div className="bg-orb bg-orb-left" />
      <div className="bg-orb bg-orb-right" />
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
                Logged in as <strong>{auth.user?.profile?.email || "(no email claim)"}</strong>
              </p>
              <button className="btn btn-secondary" onClick={signOutRedirect}>Sign out</button>
            </>
          ) : (
            <>
              <p className="status-line"><span className="status-dot" />Not logged in</p>
              <button className="btn" onClick={() => auth.signinRedirect()}>Sign in</button>
            </>
          )}
        </section>

        {auth.isAuthenticated && (
          <div className="grid">
            
            {/* --- RESTORED TOKEN SECTION --- */}
            <section className="card">
              <div className="section-head">
                <h2>Authentication Token</h2>
                <div className="actions">
                  <button className="btn btn-small btn-ghost" onClick={() => setShowToken((current) => !current)}>
                    {showToken ? "Hide" : "Show"}
                  </button>
                  <button className="btn btn-small btn-ghost" onClick={copyToken}>
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <pre className="code-block" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                ID Token: {showToken ? auth.user?.id_token : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
              </pre>
            </section>

            {/* --- RESTORED PROFILE SECTION --- */}
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

            {/* --- UPGRADED ADVANCED GRAPHICS SECTION --- */}
            <section className="card card-wide">
              <h2>Advanced Telemetry Dashboard</h2>
              {loadingData ? (
                <p className="muted">Loading real-time telemetry...</p>
              ) : dataResponse && dataResponse.data && dataResponse.data.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', marginTop: '1.5rem' }}>
                  
                  {/* Advanced Chart 1: Temperature Area Graph */}
                  <div>
                    <h4 style={{ color: '#e2e8f0', marginBottom: '0.5rem', fontWeight: '600', letterSpacing: '0.5px' }}>Temperature Variance (°C)</h4>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Real-time thermal trajectory across active nodes.</p>
                    <svg viewBox="0 0 500 220" style={{ width: '100%', height: 'auto', backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
                      <defs>
                        <linearGradient id="tempGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6"/>
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0"/>
                        </linearGradient>
                      </defs>
                      {/* Grid Lines */}
                      <line x1="40" y1="40" x2="480" y2="40" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="40" y1="100" x2="480" y2="100" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="40" y1="160" x2="480" y2="160" stroke="#334155" strokeWidth="2" />
                      
                      {(() => {
                        const telemetry = dataResponse.data;
                        const widthBetween = 440 / (telemetry.length - 1 || 1);
                        
                        // Calculate min/max for dynamic scaling
                        const temps = telemetry.map(d => Number(d.temperature || 0));
                        const minTemp = Math.min(...temps) - 2;
                        const maxTemp = Math.max(...temps) + 2;
                        const range = maxTemp - minTemp || 1;

                        const points = telemetry.map((d, idx) => {
                          const x = 40 + idx * widthBetween;
                          const temp = Number(d.temperature || 0);
                          const y = 160 - ((temp - minTemp) / range) * 120; 
                          return `${x},${y}`;
                        }).join(' ');

                        const areaPoints = `40,160 ${points} ${40 + (telemetry.length - 1) * widthBetween},160`;

                        return (
                          <>
                            <polygon points={areaPoints} fill="url(#tempGradient)" />
                            <polyline fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points} />
                            {telemetry.map((d, idx) => {
                              const x = 40 + idx * widthBetween;
                              const temp = Number(d.temperature || 0);
                              const y = 160 - ((temp - minTemp) / range) * 120;
                              return (
                                <g key={idx}>
                                  <circle cx={x} cy={y} r="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="3" />
                                  <text x={x} y={y - 15} fontSize="12" textAnchor="middle" fill="#f8fafc" fontWeight="bold">{temp.toFixed(1)}</text>
                                  <text x={x} y="180" fontSize="10" textAnchor="middle" fill="#64748b">{d.device_id}</text>
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  {/* Advanced Chart 2: Secondary Metric Bar Chart */}
                  <div>
                    <h4 style={{ color: '#e2e8f0', marginBottom: '0.5rem', fontWeight: '600', letterSpacing: '0.5px' }}>Secondary Telemetry</h4>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Auto-maps to Power (kW) or Humidity based on datasets.</p>
                    <svg viewBox="0 0 500 220" style={{ width: '100%', height: 'auto', backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
                      <line x1="40" y1="160" x2="480" y2="160" stroke="#334155" strokeWidth="2" />
                      {(() => {
                        const telemetry = dataResponse.data;
                        const totalWidth = 440;
                        const barWidth = Math.min(35, (totalWidth / telemetry.length) * 0.5);
                        const spacing = (totalWidth - (barWidth * telemetry.length)) / (telemetry.length + 1);

                        // Find maximum value for dynamic scaling
                        const maxVal = Math.max(...telemetry.map(d => Number(d.power_kw || d.Power || d.power || d.humidity || d.Humidity || 0))) || 10;

                        return telemetry.map((d, idx) => {
                          const x = 40 + spacing + idx * (barWidth + spacing);
                          // Auto-fallback mapping to find whatever secondary data is in the CSV
                          const val = Number(d.power_kw || d.Power || d.power || d.humidity || d.Humidity || 0);
                          const barHeight = (val / maxVal) * 120; 
                          const y = 160 - barHeight;

                          return (
                            <g key={idx}>
                              <rect x={x} y={y} width={barWidth} height={barHeight} fill="#10b981" rx="4" opacity="0.85" />
                              <rect x={x} y={y} width={barWidth} height={barHeight} fill="url(#tempGradient)" style={{mixBlendMode: 'overlay'}} rx="4" />
                              <text x={x + barWidth / 2} y={y - 8} fontSize="12" textAnchor="middle" fill="#f8fafc" fontWeight="bold">{val}</text>
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
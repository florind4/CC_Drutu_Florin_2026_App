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

  // Helper to determine if user is admin
  const isAdmin = profile?.role === "admin";

  return (
    <div className="app-shell">
      <div className="bg-orb bg-orb-left" style={{ opacity: 0.6, filter: 'blur(80px)' }} />
      <div className="bg-orb bg-orb-right" style={{ opacity: 0.4, filter: 'blur(100px)', background: '#8b5cf6' }} />
      
      <main className="app">
        <header className="hero" style={{ paddingBottom: '1rem' }}>
          <p className="hero-kicker" style={{ color: '#38bdf8', fontWeight: 'bold', letterSpacing: '1px' }}>IDENTITY + SERVERLESS</p>
          <h1 style={{ background: 'linear-gradient(to right, #e0f2fe, #818cf8)', WebkitBackgroundClip: 'text', color: 'transparent', fontSize: '3rem', margin: '0.5rem 0' }}>
            Cloud Computing App
          </h1>
          <p className="hero-subtitle" style={{ color: '#94a3b8' }}>
            Secure frontend with Amazon Cognito authentication and Azure Functions APIs.
          </p>
        </header>

        {error && <div className="alert" style={{ borderLeft: '4px solid #ef4444' }}><strong>Error:</strong> {error}</div>}

        <section className="card status-card" style={{ borderTop: '4px solid #38bdf8', backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(10px)' }}>
          {auth.isAuthenticated ? (
            <>
              <p className="status-line">
                <span className="status-dot status-dot-online" style={{ boxShadow: '0 0 8px #10b981' }} />
                Logged in as <strong style={{ color: '#f8fafc' }}>{auth.user?.profile?.email || "(no email claim)"}</strong>
                {isAdmin && (
                  <span style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', marginLeft: '12px', fontWeight: 'bold', letterSpacing: '0.5px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                    ADMIN
                  </span>
                )}
              </p>
              <button className="btn btn-secondary" onClick={signOutRedirect} style={{ transition: 'all 0.2s' }}>Sign out</button>
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
            
            {/* --- TOKEN & PROFILE SECTION --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', gridColumn: '1 / -1' }}>
              <section className="card" style={{ border: '1px solid #1e293b' }}>
                <div className="section-head">
                  <h2 style={{ fontSize: '1.1rem', color: '#cbd5e1' }}>Authentication Token</h2>
                  <div className="actions">
                    <button className="btn btn-small btn-ghost" onClick={() => setShowToken((current) => !current)}>
                      {showToken ? "Hide" : "Show"}
                    </button>
                    <button className="btn btn-small btn-ghost" onClick={copyToken}>
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                <pre className="code-block" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: '150px', overflowY: 'auto', background: '#0b1120', border: '1px solid #334155' }}>
                  ID Token: {showToken ? auth.user?.id_token : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                </pre>
              </section>

              <section className="card" style={{ border: '1px solid #1e293b' }}>
                <h2 style={{ fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '1rem' }}>User Profile Identity</h2>
                {loadingProfile ? (
                  <p className="muted">Loading profile...</p>
                ) : profile ? (
                  <pre className="code-block" style={{ background: '#0b1120', border: '1px solid #334155' }}>{JSON.stringify(profile, null, 2)}</pre>
                ) : (
                  <p className="muted">No profile loaded yet.</p>
                )}
              </section>
            </div>

            {/* --- STRICTLY ADMIN ONLY: GLOBAL DATA DUMP --- */}
            {isAdmin && (
              <section className="card card-wide" style={{ background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)', borderLeft: '4px solid #8b5cf6', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ color: '#c4b5fd', margin: 0 }}>Admin Console: Global Data Stream</h2>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Viewing all network devices</span>
                </div>
                {loadingData ? (
                  <p className="muted" style={{ color: '#8b5cf6' }}>Intercepting global data...</p>
                ) : dataResponse ? (
                  <pre className="code-block" style={{ maxHeight: '250px', overflowY: 'auto', background: '#020617', border: '1px solid #334155', color: '#10b981' }}>
                    {JSON.stringify(dataResponse, null, 2)}
                  </pre>
                ) : (
                  <p className="muted">No network data detected.</p>
                )}
              </section>
            )}

            {/* --- ADVANCED GRAPHICS SECTION --- */}
            <section className="card card-wide" style={{ borderTop: '1px solid #1e293b', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}>
              <h2>Telemetry Dashboard</h2>
              {loadingData ? (
                <p className="muted">Loading real-time telemetry...</p>
              ) : dataResponse && dataResponse.data && dataResponse.data.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', marginTop: '1.5rem' }}>
                  
                  {/* Chart 1 */}
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                    <h4 style={{ color: '#38bdf8', marginBottom: '0.5rem', fontWeight: '600', letterSpacing: '0.5px' }}>Temperature Variance (°C)</h4>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Real-time thermal trajectory.</p>
                    <svg viewBox="0 0 500 220" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                      <defs>
                        <linearGradient id="tempGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4"/>
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0"/>
                        </linearGradient>
                      </defs>
                      <line x1="40" y1="40" x2="480" y2="40" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="40" y1="100" x2="480" y2="100" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="40" y1="160" x2="480" y2="160" stroke="#334155" strokeWidth="2" />
                      
                      {(() => {
                        const telemetry = dataResponse.data;
                        const widthBetween = 440 / (telemetry.length - 1 || 1);
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
                            <polyline fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points} style={{ filter: 'drop-shadow(0px 4px 6px rgba(56, 189, 248, 0.4))' }} />
                            {telemetry.map((d, idx) => {
                              const x = 40 + idx * widthBetween;
                              const temp = Number(d.temperature || 0);
                              const y = 160 - ((temp - minTemp) / range) * 120;
                              return (
                                <g key={idx}>
                                  <circle cx={x} cy={y} r="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="3" />
                                  <text x={x} y={y - 15} fontSize="12" textAnchor="middle" fill="#f8fafc" fontWeight="bold">{temp.toFixed(1)}</text>
                                  <text x={x} y="180" fontSize="10" textAnchor="middle" fill="#94a3b8">{d.device_id}</text>
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  {/* Chart 2 */}
                  <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <h4 style={{ color: '#10b981', marginBottom: '0.5rem', fontWeight: '600', letterSpacing: '0.5px' }}>Secondary Telemetry</h4>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Auto-maps available secondary metrics.</p>
                    <svg viewBox="0 0 500 220" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                      <line x1="40" y1="160" x2="480" y2="160" stroke="#334155" strokeWidth="2" />
                      {(() => {
                        const telemetry = dataResponse.data;
                        const totalWidth = 440;
                        const barWidth = Math.min(35, (totalWidth / telemetry.length) * 0.5);
                        const spacing = (totalWidth - (barWidth * telemetry.length)) / (telemetry.length + 1);
                        const maxVal = Math.max(...telemetry.map(d => Number(d.power_kw || d.Power || d.power || d.humidity || d.Humidity || 0))) || 10;

                        return telemetry.map((d, idx) => {
                          const x = 40 + spacing + idx * (barWidth + spacing);
                          const val = Number(d.power_kw || d.Power || d.power || d.humidity || d.Humidity || 0);
                          const barHeight = (val / maxVal) * 120; 
                          const y = 160 - barHeight;

                          return (
                            <g key={idx}>
                              <rect x={x} y={y} width={barWidth} height={barHeight} fill="#10b981" rx="4" style={{ filter: 'drop-shadow(0px 4px 8px rgba(16, 185, 129, 0.3))' }} />
                              <text x={x + barWidth / 2} y={y - 8} fontSize="12" textAnchor="middle" fill="#f8fafc" fontWeight="bold">{val}</text>
                              <text x={x + barWidth / 2} y="180" fontSize="10" textAnchor="middle" fill="#94a3b8">{d.device_id}</text>
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
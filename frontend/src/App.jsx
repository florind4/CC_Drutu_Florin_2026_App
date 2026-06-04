// for docker cache

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

  useEffect(() => {
    if (!idToken) return;
    setLoadingProfile(true);
    fetch(`${API_BASE}/api/profile`, { headers: { Authorization: `Bearer ${idToken}` } })
      .then((res) => res.json())
      .then(setProfile)
      .finally(() => setLoadingProfile(false));

    setLoadingData(true);
    fetch(`${API_BASE}/api/data`, { headers: { Authorization: `Bearer ${idToken}` } })
      .then((res) => res.json())
      .then(setDataResponse)
      .finally(() => setLoadingData(false));
  }, [idToken]);

  const signOutRedirect = () => {
    auth.removeUser();
    window.location.href = `${COGNITO_DOMAIN}/logout?client_id=${OIDC_CONFIG.client_id}&logout_uri=${encodeURIComponent(LOGOUT_URI)}`;
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
            <section className="card card-wide">
              <h2>Telemetry Visualizer</h2>
              {loadingData ? (
                <p className="muted">Loading real-time telemetry...</p>
              ) : dataResponse && dataResponse.data && dataResponse.data.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                  <div>
                    <h4>Temperature Trajectory (°C)</h4>
                    <svg viewBox="0 0 500 200" style={{ width: '100%', height: 'auto', backgroundColor: '#0f172a', padding: '10px' }}>
                      <line x1="40" y1="160" x2="480" y2="160" stroke="#334155" strokeWidth="2" />
                      {(() => {
                        const telemetry = dataResponse.data;
                        const widthBetween = 440 / (telemetry.length - 1 || 1);
                        const points = telemetry.map((d, idx) => `${40 + idx * widthBetween},${160 - ((Number(d.temperature || 20) - 15) / 15) * 140}`).join(' ');
                        return (
                          <>
                            <polyline fill="none" stroke="#38bdf8" strokeWidth="3" points={points} />
                            {telemetry.map((d, idx) => (
                              <g key={idx}>
                                <circle cx={40 + idx * widthBetween} cy={160 - ((Number(d.temperature || 20) - 15) / 15) * 140} r="5" fill="#38bdf8" />
                                <text x={40 + idx * widthBetween} y={160 - ((Number(d.temperature || 20) - 15) / 15) * 140 - 12} fontSize="12" textAnchor="middle" fill="#e2e8f0">{d.temperature}</text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                  <div>
                    <h4>Power Load (kW)</h4>
                    <svg viewBox="0 0 500 200" style={{ width: '100%', height: 'auto', backgroundColor: '#0f172a', padding: '10px' }}>
                      <line x1="40" y1="160" x2="480" y2="160" stroke="#334155" strokeWidth="2" />
                      {(() => {
                        const telemetry = dataResponse.data;
                        const barWidth = Math.min(40, (440 / telemetry.length) * 0.6);
                        const spacing = (440 - (barWidth * telemetry.length)) / (telemetry.length + 1);
                        return telemetry.map((d, idx) => {
                          const x = 40 + spacing + idx * (barWidth + spacing);
                          const power = Number(d.power_kw || 0);
                          const barHeight = (power / 3) * 140; 
                          return (
                            <g key={idx}>
                              <rect x={x} y={160 - barHeight} width={barWidth} height={barHeight} fill="#10b981" rx="4" />
                              <text x={x + barWidth / 2} y={160 - barHeight - 8} fontSize="12" textAnchor="middle" fill="#e2e8f0">{power}</text>
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
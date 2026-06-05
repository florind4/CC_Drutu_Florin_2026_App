import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "react-oidc-context";
import { API_BASE, COGNITO_DOMAIN, LOGOUT_URI, OIDC_CONFIG } from "./config";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import "./App.css";

// Helper function to clean the extra quotes from the backend CSV parser
const cleanRawData = (rawData) => {
  if (!rawData || !Array.isArray(rawData)) return [];
  return rawData.map((item) => {
    const cleanItem = {};
    for (const [key, value] of Object.entries(item)) {
      // Remove leading/trailing quotes and trim spaces from keys and values
      const cleanKey = key.replace(/^["']|["']$/g, "").trim();
      const cleanVal = typeof value === "string" ? value.replace(/^["']|["']$/g, "").trim() : value;
      
      // Convert numeric strings to actual numbers for the graph
      cleanItem[cleanKey] = !isNaN(cleanVal) && cleanVal !== "" ? Number(cleanVal) : cleanVal;
    }
    return cleanItem;
  });
};

function App() {
  const auth = useAuth();

  const [profile, setProfile] = useState(null);
  const [dataResponse, setDataResponse] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // State to toggle the new Admin Dashboard
  const [showDashboard, setShowDashboard] = useState(false);

  const idToken = auth.user?.id_token;

  // Clean the data automatically whenever dataResponse changes
  const cleanedTelemetryData = useMemo(() => {
    return dataResponse?.data ? cleanRawData(dataResponse.data) : [];
  }, [dataResponse]);

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

    auth.removeUser();
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
            
            {/* NEW ADMIN DASHBOARD SECTION */}
            {dataResponse && dataResponse.role === "admin" && cleanedTelemetryData.length > 0 && (
              <section className="card card-wide">
                <div className="section-head">
                  <h2>Admin Telemetry Dashboard</h2>
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() => setShowDashboard(!showDashboard)}
                  >
                    {showDashboard ? "Hide Dashboard" : "Show Dashboard"}
                  </button>
                </div>

                {showDashboard && (
                  <div className="dashboard-content" style={{ marginTop: '20px' }}>
                    {/* The Graph */}
                    <div style={{ width: '100%', height: 350, marginBottom: '30px' }}>
                      <ResponsiveContainer>
                        <LineChart data={cleanedTelemetryData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(17, 48, 83, 0.1)" />
                          <XAxis 
                            dataKey="timestamp" 
                            tick={{ fontSize: 12, fill: '#5a6678' }} 
                            tickFormatter={(tick) => new Date(tick).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          />
                          <YAxis tick={{ fontSize: 12, fill: '#5a6678' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: 'none', color: '#fff', borderRadius: '8px' }} 
                            labelFormatter={(label) => new Date(label).toLocaleString()}
                          />
                          <Legend verticalAlign="top" height={36}/>
                          <Line type="monotone" name="Temperature (°C)" dataKey="temperature" stroke="#0e7a6f" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line type="monotone" name="Humidity (%)" dataKey="humidity" stroke="#3f5d80" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* The Table */}
                    <div className="data-table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Device ID</th>
                            <th>Timestamp</th>
                            <th>Temp (°C)</th>
                            <th>Humidity (%)</th>
                            <th>Power (kW)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cleanedTelemetryData.map((row, idx) => (
                            <tr key={idx}>
                              <td><strong>{row.device_id || "N/A"}</strong></td>
                              <td>{row.timestamp ? new Date(row.timestamp).toLocaleString() : "N/A"}</td>
                              <td>{row.temperature}</td>
                              <td>{row.humidity}</td>
                              <td>{row.power_kw}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Existing Sections */}
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

            <section className="card card-wide">
              <h2>Data API Response (Raw)</h2>
              {loadingData ? (
                <p className="muted">Loading data...</p>
              ) : dataResponse ? (
                <pre className="code-block">{JSON.stringify(dataResponse, null, 2)}</pre>
              ) : (
                <p className="muted">No data loaded yet.</p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
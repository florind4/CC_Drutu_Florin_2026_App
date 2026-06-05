import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, avgTemp: 0, totalLoad: 0 });

  useEffect(() => {
    // Fetch data from your deployed Azure Function backend
    fetch(`${process.env.REACT_APP_API_BASE}/api/telemetry`)
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setData(res.data);
          
          // Calculate KPIs
          const total = res.data.length;
          const avgTemp = res.data.reduce((acc, curr) => acc + curr.temperature, 0) / total;
          const totalLoad = res.data.reduce((acc, curr) => acc + curr.powerLoad, 0);
          
          setMetrics({ total, avgTemp: avgTemp.toFixed(1), totalLoad: totalLoad.toFixed(0) });
        }
      })
      .catch(err => console.error("Error loading dashboard data:", err));
  }, []);

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <h2 style={{ marginBottom: '24px', color: '#1e293b' }}>Telemetry Visualizer</h2>
      
      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#64748b', fontSize: '14px' }}>Total Readings</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{metrics.total}</div>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#64748b', fontSize: '14px' }}>Avg Temperature</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{metrics.avgTemp}°C</div>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#64748b', fontSize: '14px' }}>Accumulated Load</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{metrics.totalLoad} kW</div>
        </div>
      </div>

      {/* Charts section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        {/* Line Chart */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '16px', color: '#334155' }}>Temperature Trajectory</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="temperature" stroke="#2563eb" name="Temperature (°C)" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '16px', color: '#334155' }}>Power Profile</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="powerLoad" fill="#10b981" name="Power Load (kW)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
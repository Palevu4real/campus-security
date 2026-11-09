import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    lockedUsers: 0,
    criticalAlerts: 0,
    totalResults: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder — we'll wire real stats in Batch 4
    api.get('/auth/me')
      .then(() => {
        // Just verify we're authed
        setStats({
          totalUsers: '—',
          lockedUsers: '—',
          criticalAlerts: '—',
          totalResults: '—',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'bg-blue-500' },
    { label: 'Locked Accounts', value: stats.lockedUsers, icon: '🔒', color: 'bg-red-500' },
    { label: 'Critical Alerts', value: stats.criticalAlerts, icon: '🚨', color: 'bg-orange-500' },
    { label: 'Total Results', value: stats.totalResults, icon: '📚', color: 'bg-green-500' },
  ];

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Real-time overview of campus security events
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{c.label}</span>
              <span className={`text-2xl p-2 rounded-lg ${c.color} bg-opacity-10`}>
                {c.icon}
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {loading ? '...' : c.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Welcome to the Security Console
        </h2>
        <p className="text-gray-600 text-sm">
          Use the sidebar to view live alerts, manage locked accounts, and
          inspect tamper attempts. All activity is logged with severity levels.
        </p>
      </div>
    </div>
  );
}
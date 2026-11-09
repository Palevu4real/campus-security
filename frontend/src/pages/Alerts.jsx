import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import toast from 'react-hot-toast';

const SEVERITY_STYLES = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  INFO: 'bg-blue-100 text-blue-800 border-blue-200',
};

const TYPE_ICONS = {
  BRUTE_FORCE: '🔨',
  TAMPER_ATTEMPT: '🕵️',
  IDS_BLOCKED: '🚫',
  DATA_INTEGRITY_VIOLATION: '⚠️',
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  // Fetch existing alerts
  useEffect(() => {
    api.get('/alerts?limit=50')
      .then(({ data }) => setAlerts(data.alerts))
      .catch((err) => toast.error('Failed to load alerts'))
      .finally(() => setLoading(false));
  }, []);

  // Subscribe to real-time alerts
  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      console.warn('Socket not connected yet');
      return;
    }

    function onConnect() {
      setConnected(true);
      socket.emit('join:admin');
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onNewAlert(alert) {
      setAlerts((prev) => [alert, ...prev].slice(0, 100));
      toast.custom((t) => (
        <div className="bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm">
          <div className="font-bold mb-1">🚨 {alert.title}</div>
          <div className="text-sm">{alert.message}</div>
        </div>
      ), { duration: 6000 });
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('alert:new', onNewAlert);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('alert:new', onNewAlert);
    };
  }, []);

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Alerts</h1>
          <p className="text-gray-500 mt-1">
            Real-time security events. New alerts appear instantly.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`w-3 h-3 rounded-full ${
              connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}
          />
          <span className="text-gray-600">
            {connected ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </header>

      {loading ? (
        <div className="text-gray-500">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-gray-600">No alerts yet. All clear.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-xl p-4 ${
                SEVERITY_STYLES[alert.severity] || 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">
                  {TYPE_ICONS[alert.type] || '⚠️'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold">{alert.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white bg-opacity-60">
                      {alert.severity}
                    </span>
                    {alert.isResolved && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-900">
                        Resolved
                      </span>
                    )}
                  </div>
                  <div className="text-sm">{alert.message}</div>
                  <div className="text-xs mt-2 opacity-70">
                    {new Date(alert.createdAt).toLocaleString()}
                    {alert.ipAddress && ` · ${alert.ipAddress}`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
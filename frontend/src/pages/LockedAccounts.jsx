import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export default function LockedAccounts() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(null); // id being unlocked

  async function fetchLocked() {
    try {
      const { data } = await api.get('/users/locked');
      setUsers(data.users);
    } catch (err) {
      toast.error('Failed to load locked accounts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLocked();
  }, []);

  async function handleUnlock(user) {
    if (!confirm(`Unlock ${user.email}?`)) return;

    setUnlocking(user.id);
    try {
      await api.post(`/users/${user.id}/unlock`);
      toast.success(`Unlocked ${user.email}`);
      // Remove from list
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to unlock');
    } finally {
      setUnlocking(null);
    }
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Locked Accounts</h1>
          <p className="text-gray-500 mt-1">
            Accounts auto-locked after 3 failed login attempts. Unlock to restore access.
          </p>
        </div>
        <button
          onClick={fetchLocked}
          className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          🔄 Refresh
        </button>
      </header>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-gray-600">No locked accounts. All users active.</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                  User
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                  Role
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                  Attempts
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                  Locked At
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                  Reason
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{u.fullName}</div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-medium">
                    {u.failedAttempts}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {u.lockedAt ? new Date(u.lockedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {u.lockedReason || '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleUnlock(u)}
                      disabled={unlocking === u.id}
                      className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg"
                    >
                      {unlocking === u.id ? 'Unlocking...' : 'Unlock'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
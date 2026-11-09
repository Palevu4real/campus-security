import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const ROLE_STYLES = {
  ADMIN: 'bg-purple-100 text-purple-800',
  SUPER_ADMIN: 'bg-purple-200 text-purple-900',
  LECTURER: 'bg-emerald-100 text-emerald-800',
  STAFF: 'bg-blue-100 text-blue-800',
  STUDENT: 'bg-gray-100 text-gray-800',
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function toggleActive(u) {
    if (!confirm(`${u.isActive ? 'Deactivate' : 'Activate'} ${u.email}?`)) return;
    try {
      await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
      toast.success(`User ${u.isActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user');
    }
  }

  const filtered = users.filter((u) => {
    if (filter && u.role !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.email.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      <header className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">Manage students, lecturers, and staff accounts.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg"
        >
          ➕ Add User
        </button>
      </header>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name..."
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg w-64"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
        >
          <option value="">All Roles</option>
          <option value="STUDENT">Students</option>
          <option value="LECTURER">Lecturers</option>
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-gray-600">No users match these filters.</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Role</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Last Login</th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{u.fullName}</div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${ROLE_STYLES[u.role] || 'bg-gray-100'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.isLocked ? (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">🔒 Locked</span>
                    ) : u.isActive ? (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">✓ Active</span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => toggleActive(u)}
                      className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddUserModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

function AddUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'STUDENT',
    department: '',
    matricNumber: '',
    staffId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  function update(f, v) {
    setForm((p) => ({ ...p, [f]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (form.role !== 'STUDENT') delete payload.matricNumber;
      if (form.role !== 'LECTURER' && form.role !== 'STAFF') delete payload.staffId;

      await api.post('/auth/register', payload);
      toast.success(`User ${form.email} created`);
      onCreated();
    } catch (err) {
      const msg = err.response?.data?.error
        || err.response?.data?.details?.[0]?.message
        || 'Failed to create user';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input required type="text" value={form.fullName} onChange={(e) => update('fullName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="user@campus.edu" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input required type="text" value={form.password} onChange={(e) => update('password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Min 8 characters" />
            <p className="text-xs text-gray-400 mt-1">Share this with the user securely.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={form.role} onChange={(e) => update('role', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="STUDENT">Student</option>
              <option value="LECTURER">Lecturer</option>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department (optional)</label>
            <input type="text" value={form.department} onChange={(e) => update('department', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Computer Science" />
          </div>
          {form.role === 'STUDENT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Matric Number (optional)</label>
              <input type="text" value={form.matricNumber} onChange={(e) => update('matricNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="CSC/2024/001" />
            </div>
          )}
          {(form.role === 'LECTURER' || form.role === 'STAFF') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Staff ID (optional)</label>
              <input type="text" value={form.staffId} onChange={(e) => update('staffId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="STAFF/CSC/005" />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting}
              className="px-6 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium rounded-lg">
              {submitting ? 'Creating...' : 'Create User'}
            </button>
            <button type="button" onClick={onClose}
              className="px-6 py-2 bg-white border border-gray-300 rounded-lg">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
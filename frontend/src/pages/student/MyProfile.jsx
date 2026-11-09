import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/portal/students/me/profile')
      .then(({ data }) => setUser(data.user))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!user) return <div className="text-gray-500">Profile not found</div>;

  const fields = [
    { label: 'Full Name', value: user.fullName },
    { label: 'Email', value: user.email },
    { label: 'Role', value: user.role },
    { label: 'Department', value: user.department || '—' },
    { label: 'Matric Number', value: user.matricNumber || '—' },
    { label: 'Last Login', value: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—' },
    { label: 'Last Login IP', value: user.lastLoginIp || '—' },
    { label: 'Account Created', value: new Date(user.createdAt).toLocaleString() },
  ];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">Your account details</p>
      </header>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 max-w-2xl">
        <div className="p-6 border-b border-gray-100 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-2xl">🎓</div>
          <div>
            <div className="text-xl font-bold text-gray-900">{user.fullName}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.label}>
                <dt className="text-xs font-medium text-gray-500 uppercase mb-1">{f.label}</dt>
                <dd className="text-sm text-gray-900">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
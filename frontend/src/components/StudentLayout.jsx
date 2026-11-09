import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/student', label: 'My Results', icon: '📚', end: true },
  { to: '/student/profile', label: 'My Profile', icon: '👤' },
];

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-brand-900 text-gray-100 flex flex-col">
        <div className="p-6 border-b border-brand-700">
          <h1 className="text-xl font-bold">🎓 Student Portal</h1>
          <p className="text-xs text-brand-300 mt-1">Campus Security</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-brand-200 hover:bg-brand-800 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-brand-700">
          <div className="text-sm mb-2">
            <div className="font-medium">{user?.fullName}</div>
            <div className="text-xs text-brand-300">{user?.email}</div>
            <div className="text-xs text-brand-400 mt-1">STUDENT</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 text-sm bg-brand-800 hover:bg-brand-700 rounded-lg"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
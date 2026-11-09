import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

const GRADE_COLORS = {
  A: 'bg-green-100 text-green-800',
  B: 'bg-blue-100 text-blue-800',
  C: 'bg-yellow-100 text-yellow-800',
  D: 'bg-orange-100 text-orange-800',
  E: 'bg-red-100 text-red-800',
  F: 'bg-red-200 text-red-900',
};

export default function MyUploads() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/portal/lecturers/me/uploads')
      .then(({ data }) => setResults(data.results))
      .catch(() => toast.error('Failed to load uploads'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Uploads</h1>
        <p className="text-gray-500 mt-1">All results you have uploaded. These are locked.</p>
      </header>
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">📤</div>
          <div className="text-gray-600">No uploads yet.</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Student</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Course</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Session</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Score</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Grade</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{r.student?.fullName || 'Unknown'}</div>
                    <div className="text-sm text-gray-500">{r.student?.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{r.course.code}</div>
                    <div className="text-sm text-gray-500">{r.course.title}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{r.session} · {r.semester}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.score}</td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${GRADE_COLORS[r.grade] || 'bg-gray-100 text-gray-700'}`}>{r.grade}</span>
                  </td>
                  <td className="px-6 py-4">
                    {r.isLocked ? (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">🔒 Locked</span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">Unlocked</span>
                    )}
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
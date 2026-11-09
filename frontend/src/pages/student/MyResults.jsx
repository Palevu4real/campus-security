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

export default function MyResults() {
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterSession, setFilterSession] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/portal/students/me/results'),
      api.get('/portal/students/me/summary'),
    ])
      .then(([resultsRes, summaryRes]) => {
        setResults(resultsRes.data.results);
        setSummary(summaryRes.data.summary);
      })
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = results.filter((r) => {
    if (filterSession && r.session !== filterSession) return false;
    if (filterSemester && r.semester !== filterSemester) return false;
    return true;
  });

  const uniqueSessions = [...new Set(results.map((r) => r.session))].sort().reverse();

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Results</h1>
        <p className="text-gray-500 mt-1">Your academic record. All results are locked and tamper-proof.</p>
      </header>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="text-xs text-gray-500 uppercase mb-1">Total Courses</div>
            <div className="text-3xl font-bold text-gray-900">{summary.totalCourses}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="text-xs text-gray-500 uppercase mb-1">Credit Units</div>
            <div className="text-3xl font-bold text-gray-900">{summary.totalUnits}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="text-xs text-gray-500 uppercase mb-1">Grade Points</div>
            <div className="text-3xl font-bold text-gray-900">{summary.totalPoints}</div>
          </div>
          <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl shadow-sm p-5 text-white">
            <div className="text-xs uppercase opacity-80 mb-1">Current GPA</div>
            <div className="text-3xl font-bold">{summary.gpa}</div>
            <div className="text-xs opacity-80 mt-1">on 5.0 scale</div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <select value={filterSession} onChange={(e) => setFilterSession(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg">
          <option value="">All Sessions</option>
          {uniqueSessions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg">
          <option value="">All Semesters</option>
          <option value="FIRST">First</option>
          <option value="SECOND">Second</option>
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-gray-600">No results found.</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Course</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Session</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Semester</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Units</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Score</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Grade</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{r.course.code}</div>
                    <div className="text-sm text-gray-500">{r.course.title}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{r.session}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{r.semester}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{r.course.creditUnits}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{r.score}</td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${GRADE_COLORS[r.grade] || 'bg-gray-100 text-gray-700'}`}>{r.grade}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">
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
      <p className="text-xs text-gray-400 mt-4 text-center">All results are cryptographically hashed and locked.</p>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export default function MyCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/portal/lecturers/me/courses')
      .then(({ data }) => setCourses(data.courses))
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
        <p className="text-gray-500 mt-1">Courses assigned to you.</p>
      </header>
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">📖</div>
          <div className="text-gray-600">No courses assigned.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div className="text-sm font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded">{c.code}</div>
                <div className="text-xs text-gray-400">{c.creditUnits} units</div>
              </div>
              <div className="font-medium text-gray-900 mb-1">{c.title}</div>
              <div className="text-sm text-gray-500 mb-4">{c.department}</div>
              <div className="text-xs text-gray-500 border-t border-gray-100 pt-3">
                {c._count.results} result{c._count.results !== 1 ? 's' : ''} uploaded
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
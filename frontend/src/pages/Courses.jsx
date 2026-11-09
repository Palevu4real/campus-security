import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [assigning, setAssigning] = useState(null);

  async function fetchAll() {
    setLoading(true);
    try {
      const [c, u] = await Promise.all([api.get('/courses'), api.get('/users')]);
      setCourses(c.data.courses);
      setLecturers(u.data.users.filter((x) => x.role === 'LECTURER'));
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  async function assignLecturer(courseId, lecturerId) {
    setAssigning(courseId);
    try {
      await api.patch(`/courses/${courseId}`, { lecturerId: lecturerId || null });
      toast.success('Lecturer assigned');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign');
    } finally {
      setAssigning(null);
    }
  }

  return (
    <div>
      <header className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-500 mt-1">Manage courses and assign lecturers.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg"
        >
          ➕ Add Course
        </button>
      </header>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-4xl mb-3">📚</div>
          <div className="text-gray-600">No courses yet.</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Code</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Title</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Units</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Results</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">Lecturer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{c.code}</div>
                    <div className="text-xs text-gray-500">{c.department}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{c.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{c.creditUnits}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{c._count?.results ?? 0}</td>
                  <td className="px-6 py-4">
                    <select
                      value={c.lecturerId || ''}
                      onChange={(e) => assignLecturer(c.id, e.target.value)}
                      disabled={assigning === c.id}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
                    >
                      <option value="">— Unassigned —</option>
                      {lecturers.map((l) => (
                        <option key={l.id} value={l.id}>{l.fullName}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddCourseModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); fetchAll(); }} />
      )}
    </div>
  );
}

function AddCourseModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ code: '', title: '', department: '', creditUnits: 3 });
  const [submitting, setSubmitting] = useState(false);

  function update(f, v) {
    setForm((p) => ({ ...p, [f]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/courses', form);
      toast.success(`Course ${form.code} created`);
      onCreated();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Add New Course</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
            <input required type="text" value={form.code}
              onChange={(e) => update('code', e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="CSC101" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input required type="text" value={form.title} onChange={(e) => update('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Intro to CS" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input required type="text" value={form.department} onChange={(e) => update('department', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Computer Science" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Credit Units</label>
            <input required type="number" min="1" max="10" value={form.creditUnits}
              onChange={(e) => update('creditUnits', parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting}
              className="px-6 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium rounded-lg">
              {submitting ? 'Creating...' : 'Create Course'}
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
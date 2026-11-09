import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';

export default function UploadResult() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('single'); // 'single' | 'bulk'

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Upload Results</h1>
        <p className="text-gray-500 mt-1">
          ⚠️ All results are <strong>immediately locked</strong> after upload.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('single')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
            tab === 'single'
              ? 'bg-emerald-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Single Upload
        </button>
        <button
          onClick={() => setTab('bulk')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
            tab === 'bulk'
              ? 'bg-emerald-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          📊 Bulk Upload (CSV)
        </button>
      </div>

      {tab === 'single' && <SingleUpload navigate={navigate} />}
      {tab === 'bulk' && <BulkUpload navigate={navigate} />}
    </div>
  );
}

/* ============ SINGLE UPLOAD ============ */
function SingleUpload({ navigate }) {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    courseId: '',
    score: '',
    session: '2024/2025',
    semester: 'FIRST',
  });

  useEffect(() => {
    Promise.all([
      api.get('/portal/lecturers/me/courses'),
      api.get('/portal/lecturers/me/students'),
    ])
      .then(([c, s]) => {
        setCourses(c.data.courses);
        setStudents(s.data.students);
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  function update(f, v) {
    setForm((p) => ({ ...p, [f]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, score: parseInt(form.score, 10) };
      const { data } = await api.post('/results', payload);
      toast.success(`Uploaded: ${data.result.course.code} — ${data.result.grade}`);
      navigate('/lecturer/uploads');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed', { duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
        <select required value={form.studentId} onChange={(e) => update('studentId', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">Select a student...</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.fullName} ({s.email})</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
        <select required value={form.courseId} onChange={(e) => update('courseId', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg">
          <option value="">Select a course...</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.title}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <input required type="text" placeholder="Session (e.g. 2024/2025)" value={form.session}
          onChange={(e) => update('session', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg" />
        <select value={form.semester} onChange={(e) => update('semester', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg">
          <option value="FIRST">First Semester</option>
          <option value="SECOND">Second Semester</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Score (0-100)</label>
        <input required type="number" min="0" max="100" value={form.score}
          onChange={(e) => update('score', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g. 75" />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={submitting}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg">
          {submitting ? 'Uploading...' : 'Upload & Lock'}
        </button>
      </div>
    </form>
  );
}

/* ============ BULK UPLOAD ============ */
function BulkUpload({ navigate }) {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [session, setSession] = useState('2024/2025');
  const [semester, setSemester] = useState('FIRST');
  const [validStudentIds, setValidStudentIds] = useState(new Set());
  const [parsedRows, setParsedRows] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState(null);

  // ---- Load courses ----
  useEffect(() => {
    api.get('/portal/lecturers/me/courses')
      .then(({ data }) => setCourses(data.courses))
      .catch(() => toast.error('Failed to load courses'));
  }, []);

  // ---- Load valid student IDs when a course is selected ----
  useEffect(() => {
    if (!courseId) {
      setValidStudentIds(new Set());
      return;
    }
    api.get(`/results/course/${courseId}/students`)
      .then(({ data }) => {
        const ids = new Set(data.students.map((s) => s.id));
        setValidStudentIds(ids);
      })
      .catch(() => toast.error('Failed to load students for course'));
  }, [courseId]);

  // ---- Row validator ----
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function validateRow(r) {
    if (!r.studentId || !String(r.studentId).trim()) {
      return 'Missing student ID';
    }
    const sid = String(r.studentId).trim();
    if (!UUID_RE.test(sid)) {
      return 'Student ID is not a valid UUID';
    }
    if (validStudentIds.size > 0 && !validStudentIds.has(sid)) {
      return 'Student not found in this course';
    }
    if (r.score === null || r.score === undefined || r.score === '') {
      return 'Missing score';
    }
    const score = parseInt(r.score, 10);
    if (isNaN(score)) return 'Score is not a number';
    if (score < 0 || score > 100) return 'Score must be between 0 and 100';
    return null;
  }

  // ---- Download template ----
  async function downloadTemplate() {
    if (!courseId) return toast.error('Select a course first');
    try {
      const { data } = await api.get(`/results/course/${courseId}/students`);
      const headers = ['studentId', 'matricNumber', 'fullName', 'score'];
      const rows = data.students.map((s) => [
        s.id,
        s.matricNumber || '',
        s.fullName,
        '',
      ]);
      const csv = Papa.unparse({ fields: headers, data: rows });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `results_template_${data.course.code}_${session.replace('/', '-')}_${semester}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch (err) {
      toast.error('Failed to download template');
    }
  }

  // ---- Parse + validate CSV ----
  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data.map((r, idx) => {
          const raw = {
            studentId: (r.studentId || '').trim(),
            matricNumber: (r.matricNumber || '').trim(),
            fullName: (r.fullName || '').trim(),
            score: r.score !== undefined && r.score !== '' ? r.score : null,
          };
          const error = validateRow(raw);
          return {
            index: idx + 1,
            ...raw,
            score: raw.score !== null ? parseInt(raw.score, 10) : null,
            error,
          };
        });
        setParsedRows(rows);
        setReport(null);
      },
      error: (err) => toast.error('CSV parse error: ' + err.message),
    });
  }

  // ---- Submit bulk ----
  async function handleSubmit() {
    if (!courseId || !session || !semester) return toast.error('Fill in all fields');
    if (!parsedRows || parsedRows.length === 0) return toast.error('Upload a CSV first');
    if (parsedRows.some((r) => r.error)) {
      return toast.error('Fix all invalid rows before submitting');
    }
    if (parsedRows.length === 0) return toast.error('No rows');

    setSubmitting(true);
    try {
      const { data } = await api.post('/results/bulk', {
        courseId,
        session,
        semester,
        rows: parsedRows.map((r) => ({ studentId: r.studentId, score: r.score })),
      });
      setReport(data);
      toast.success(`Bulk upload: ${data.succeeded} succeeded, ${data.failed} failed`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bulk upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  const validCount = parsedRows ? parsedRows.filter((r) => !r.error).length : 0;
  const invalidCount = parsedRows ? parsedRows.filter((r) => r.error).length : 0;
  const canSubmit = parsedRows && parsedRows.length > 0 && invalidCount === 0 && !submitting;

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-3xl">
        <h2 className="text-lg font-semibold mb-4">1. Configure Upload</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">Select a course...</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
            <input type="text" value={session} onChange={(e) => setSession(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="2024/2025" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <select value={semester} onChange={(e) => setSemester(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="FIRST">First</option>
              <option value="SECOND">Second</option>
            </select>
          </div>
        </div>
      </div>

      {/* Download template */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-3xl">
        <h2 className="text-lg font-semibold mb-2">2. Download Template</h2>
        <p className="text-sm text-gray-500 mb-4">
          Get a CSV pre-filled with all students. Fill in the "score" column only — do not modify the studentId column.
        </p>
        <button onClick={downloadTemplate} disabled={!courseId}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm">
          📥 Download CSV Template
        </button>
      </div>

      {/* Upload filled CSV */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-3xl">
        <h2 className="text-lg font-semibold mb-2">3. Upload Filled CSV</h2>
        <input type="file" accept=".csv" onChange={handleFile}
          className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
      </div>

      {/* Preview */}
      {parsedRows && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">4. Preview & Confirm</h2>
            <div className="text-sm">
              {invalidCount === 0 ? (
                <span className="text-green-700 font-medium">✅ {validCount} ready to submit</span>
              ) : (
                <span className="text-red-700 font-medium">❌ {invalidCount} invalid · ✅ {validCount} valid</span>
              )}
            </div>
          </div>

          {invalidCount > 0 && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              ⚠️ Fix all invalid rows before submitting. The backend will reject the entire request otherwise.
            </div>
          )}

          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-xs text-gray-500 uppercase">#</th>
                  <th className="text-left px-3 py-2 text-xs text-gray-500 uppercase">Student</th>
                  <th className="text-left px-3 py-2 text-xs text-gray-500 uppercase">Score</th>
                  <th className="text-left px-3 py-2 text-xs text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parsedRows.map((r, i) => (
                  <tr key={i} className={r.error ? 'bg-red-50' : 'bg-green-50/30'}>
                    <td className="px-3 py-2 text-gray-500">{r.index}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.fullName || '—'}</div>
                      <div className="text-xs text-gray-400 font-mono">{r.studentId || '—'}</div>
                    </td>
                    <td className="px-3 py-2 font-medium">{r.score ?? '—'}</td>
                    <td className="px-3 py-2">
                      {r.error ? (
                        <span className="text-xs text-red-600">❌ {r.error}</span>
                      ) : (
                        <span className="text-xs text-green-700">✓ Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg"
            >
              {submitting ? 'Submitting...' : `Submit ${validCount} Result${validCount !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={() => { setParsedRows(null); setReport(null); }}
              className="px-6 py-2 bg-white border border-gray-300 rounded-lg"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">5. Result Report</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase">Total</div>
              <div className="text-2xl font-bold">{report.total}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase">Succeeded</div>
              <div className="text-2xl font-bold text-green-700">{report.succeeded}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase">Failed</div>
              <div className="text-2xl font-bold text-red-700">{report.failed}</div>
            </div>
          </div>

          {report.failures.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 text-red-700">Failed Rows</h3>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                {report.failures.map((f, i) => (
                  <li key={i}>
                    Row {f.row} ({String(f.studentId).slice(0, 8)}…): {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => navigate('/lecturer/uploads')}
            className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm"
          >
            View All Uploads →
          </button>
        </div>
      )}
    </div>
  );
}
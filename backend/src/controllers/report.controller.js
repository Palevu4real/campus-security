import { generateIncidentReport } from '../services/report.service.js';
import { logActivity } from '../services/audit.service.js';

export async function downloadIncidentReport(req, res, next) {
  try {
    const { from, to } = req.query;

    const pdfBuffer = await generateIncidentReport({ from, to, req });

    await logActivity({
      userId: req.user.id,
      action: 'INCIDENT_REPORT_DOWNLOADED',
      severity: 'INFO',
      req,
      metadata: { from, to, sizeBytes: pdfBuffer.length },
    });

    const filename = `incident-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    next(err);
  }
}
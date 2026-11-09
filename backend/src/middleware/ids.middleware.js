import { logger } from '../config/logger.js';
import { logActivity, raiseAlert } from '../services/audit.service.js';

const SUSPICIOUS_UA = /sqlmap|nikto|nmap|masscan|zgrab|acunetix|dirbuster|nessus|openvas|hydra|wfuzz|gobuster/i;

const INJECTION_PATTERNS = [
  { name: 'SQL_INJECTION', re: /\b(union\s+select|select\s+.*\s+from|insert\s+into|drop\s+table|delete\s+from|update\s+.*\s+set)\b|('\s*or\s+'?\d+'?\s*=\s*'?\d+|"\s*or\s+"?\d+"?\s*=\s*"?\d+)/i },
  { name: 'NOSQL_INJECTION', re: /\{\s*"\$?(where|ne|gt|regex|options)"\s*:/i },
  { name: 'PATH_TRAVERSAL', re: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/i },
  { name: 'XSS_ATTEMPT', re: /(<script|javascript:|onerror\s*=|onload\s*=|<\s*iframe)/i },
  { name: 'COMMAND_INJECTION', re: /(;\s*(cat|ls|whoami|id|curl|wget|nc|bash|sh)\s)|(\|\s*(cat|ls|whoami|id|nc|bash|sh)\s)|(\$\(.*\))|(`[^`]+`)/i },
];

export async function idsMiddleware(req, res, next) {
  const threats = [];

  const ua = req.headers['user-agent'] || '';
  if (SUSPICIOUS_UA.test(ua)) {
    threats.push({ category: 'SUSPICIOUS_USER_AGENT', detail: ua.slice(0, 200) });
  }

  const haystack = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  for (const { name, re } of INJECTION_PATTERNS) {
    if (re.test(haystack)) {
      threats.push({ category: name, detail: 'signature_match' });
    }
  }

  if (threats.length === 0) return next();

  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const path = req.originalUrl;

  logger.error('IDS BLOCKED REQUEST', { ip, path, threats, ua: ua.slice(0, 100) });

  logActivity({
    action: 'IDS_BLOCKED',
    severity: 'CRITICAL',
    req,
    metadata: { threats, userAgent: ua.slice(0, 200) },
  }).catch(() => {});

  raiseAlert({
    type: 'IDS_BLOCKED',
    severity: 'CRITICAL',
    title: `IDS blocked request from ${ip}`,
    message: `Threats: ${threats.map((t) => t.category).join(', ')}`,
    ipAddress: ip,
    metadata: { path, threats, ua: ua.slice(0, 200) },
  }).catch(() => {});

  return res.status(403).json({
    error: 'Request blocked by intrusion detection system',
    requestId: req.headers['x-request-id'] || undefined,
  });
}
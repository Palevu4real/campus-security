import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
    logger.warn('Email transporter not configured — skipping email sends');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: false,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });

  return transporter;
}

export async function sendAlertEmail(alert) {
  const tx = getTransporter();
  if (!tx) return { sent: false, reason: 'not_configured' };

  const severityColor = {
    CRITICAL: '#dc2626',
    WARNING: '#f59e0b',
    INFO: '#3b82f6',
  }[alert.severity] || '#6b7280';

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px;">
      <div style="background: ${severityColor}; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
        <div style="font-size: 12px; text-transform: uppercase; opacity: 0.9;">${alert.severity} ALERT</div>
        <div style="font-size: 20px; font-weight: 700; margin-top: 4px;">${alert.title}</div>
      </div>
      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 12px 0; color: #374151;">${alert.message}</p>
        <table style="width: 100%; font-size: 13px; color: #4b5563; border-collapse: collapse;">
          <tr><td style="padding: 6px 0;"><strong>Type:</strong></td><td>${alert.type}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Severity:</strong></td><td>${alert.severity}</td></tr>
          ${alert.ipAddress ? `<tr><td style="padding: 6px 0;"><strong>IP:</strong></td><td>${alert.ipAddress}</td></tr>` : ''}
          <tr><td style="padding: 6px 0;"><strong>When:</strong></td><td>${new Date(alert.createdAt).toLocaleString()}</td></tr>
        </table>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;">
        <p style="font-size: 12px; color: #6b7280; margin: 0;">
          This is an automated message from your Campus Security System.
        </p>
      </div>
    </div>
  `;

  try {
    await tx.sendMail({
      from: `"Campus Security" <${env.smtp.user}>`,
      to: env.smtp.adminEmail || env.smtp.user,
      subject: `[${alert.severity}] ${alert.title}`,
      html,
    });
    logger.info('Alert email sent', { to: env.smtp.adminEmail, type: alert.type });
    return { sent: true };
  } catch (err) {
    logger.error('Failed to send alert email', { error: err.message });
    return { sent: false, reason: err.message };
  }
}

export async function sendEmail({ to, subject, html, attachments = [] }) {
  const tx = getTransporter();
  if (!tx) return { sent: false, reason: 'not_configured' };

  try {
    await tx.sendMail({
      from: `"Campus Security" <${env.smtp.user}>`,
      to, subject, html, attachments,
    });
    return { sent: true };
  } catch (err) {
    logger.error('Failed to send email', { error: err.message, to });
    return { sent: false, reason: err.message };
  }
}
import nodemailer from 'nodemailer';

const isConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const FROM = process.env.SMTP_FROM ?? 'FreshGuard <no-reply@freshguard.io>';

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email via SMTP when credentials are configured (see .env.example).
 * Falls back to logging the email to the server console in local/dev environments
 * that have not set up SMTP yet, so the app never crashes for missing config.
 */
export const sendMail = async ({ to, subject, html }: MailPayload) => {
  if (!transporter) {
    console.log('--- [FreshGuard Mailer: SMTP not configured, logging instead] ---');
    console.log(`To: ${to}\nSubject: ${subject}\n${html}`);
    console.log('--------------------------------------------------------------');
    return { delivered: false, mode: 'console' as const };
  }

  await transporter.sendMail({ from: FROM, to, subject, html });
  return { delivered: true, mode: 'smtp' as const };
};

export const welcomeEmail = (name: string, role: string) => ({
  subject: 'Welcome to FreshGuard',
  html: `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#1B5E20;">Welcome to FreshGuard, ${name}</h2>
      <p>Your ${role} account has been created successfully. You can now sign in to the
      ${role === 'admin' ? 'Command Center' : 'Driver Portal'} to start monitoring cold-chain operations.</p>
      <p style="color:#64748b;font-size:13px;margin-top:32px;">If you didn't create this account, please ignore this email.</p>
    </div>
  `,
});

export const passwordResetEmail = (resetCode: string) => ({
  subject: 'FreshGuard password reset code',
  html: `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#1B5E20;">Reset your password</h2>
      <p>Use the code below to reset your FreshGuard account password. This code expires in 15 minutes.</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px;color:#1B5E20;">${resetCode}</p>
      <p style="color:#64748b;font-size:13px;margin-top:32px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `,
});

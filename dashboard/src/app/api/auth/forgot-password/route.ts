import { NextResponse } from 'next/server';
import { findUserByEmail, setResetCode } from '@/lib/users';
import { sendMail, passwordResetEmail } from '@/lib/mailer';

export async function POST(request: Request) {
  const body = await request.json();
  const { email } = body;

  if (!email) {
    return NextResponse.json({ success: false, message: 'Email is required.' }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  // Always respond with a generic success message so we don't leak which emails are registered.
  if (user) {
    const resetCode = await setResetCode(email);
    if (resetCode) {
      const { subject, html } = passwordResetEmail(resetCode);
      await sendMail({ to: email, subject, html });
    }
  }

  return NextResponse.json({ success: true, message: `If an account exists for ${email}, a reset code has been sent.` });
}

import { NextResponse } from 'next/server';
import { resetPasswordWithCode } from '@/lib/users';

export async function POST(request: Request) {
  const body = await request.json();
  const { email, code, newPassword } = body;

  if (!email || !code || !newPassword) {
    return NextResponse.json({ success: false, message: 'Email, code, and new password are required.' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ success: false, message: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  try {
    await resetPasswordWithCode(email, code, newPassword);
    return NextResponse.json({ success: true, message: 'Password updated. You can now sign in.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not reset password.';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}

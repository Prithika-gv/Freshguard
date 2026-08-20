import { NextResponse } from 'next/server';
import { createUser } from '@/lib/users';
import { sendMail, welcomeEmail } from '@/lib/mailer';

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, password, role } = body;

  if (!name || !email || !password || !role) {
    return NextResponse.json({ success: false, message: 'Name, email, password, and role are required.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ success: false, message: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  try {
    const user = await createUser({ name, email, password, role });
    const { subject, html } = welcomeEmail(user.name, user.role);
    await sendMail({ to: user.email, subject, html });
    return NextResponse.json({ success: true, role: user.role, email: user.email, name: user.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create account.';
    return NextResponse.json({ success: false, message }, { status: 409 });
  }
}

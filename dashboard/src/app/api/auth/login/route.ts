import { NextResponse } from 'next/server';
import { verifyCredentials } from '@/lib/users';

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, role } = body;

  if (!email || !password) {
    return NextResponse.json({ success: false, message: 'Email and password are required.' }, { status: 400 });
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status: 401 });
  }

  if (role && user.role !== role) {
    return NextResponse.json({ success: false, message: `This account is registered as ${user.role}, not ${role}.` }, { status: 403 });
  }

  return NextResponse.json({ success: true, role: user.role, email: user.email, name: user.name });
}

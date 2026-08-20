import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { getSupabase } from './supabase';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'driver';
  passwordHash: string;
  resetCode?: string;
  resetCodeExpiresAt?: number;
  createdAt: string;
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(':');
  const derived = scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');
  return keyBuffer.length === derived.length && timingSafeEqual(keyBuffer, derived);
}

// Vercel's deployed filesystem is read-only, so the original local-JSON-file
// version of this module crashed on first login attempt in production. This
// version stores accounts in Supabase (table: app_users) instead - same
// exported functions, same behavior, so nothing else in the app needed to change.

let seeded = false;
async function ensureSeedAdmin() {
  if (seeded) return;
  const sb = getSupabase();
  const { data } = await sb.from('app_users').select('id').eq('email', 'admin@freshguard.io').maybeSingle();
  if (!data) {
    await sb.from('app_users').insert({
      id: 'seed-admin',
      name: 'FreshGuard Admin',
      email: 'admin@freshguard.io',
      role: 'admin',
      password_hash: hashPassword('freshguard123'),
      created_at: new Date().toISOString(),
    });
  }
  seeded = true;
}

function fromRow(row: Record<string, unknown>): StoredUser {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as 'admin' | 'driver',
    passwordHash: row.password_hash as string,
    resetCode: (row.reset_code as string | null) ?? undefined,
    resetCodeExpiresAt: (row.reset_code_expires_at as number | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  await ensureSeedAdmin();
  const sb = getSupabase();
  const { data } = await sb.from('app_users').select('*').ilike('email', email).maybeSingle();
  return data ? fromRow(data) : null;
}

export async function createUser(input: { name: string; email: string; password: string; role: 'admin' | 'driver' }) {
  const existing = await findUserByEmail(input.email);
  if (existing) throw new Error('An account with this email already exists.');
  const sb = getSupabase();
  const row = {
    id: randomBytes(8).toString('hex'),
    name: input.name,
    email: input.email,
    role: input.role,
    password_hash: hashPassword(input.password),
    created_at: new Date().toISOString(),
  };
  const { error } = await sb.from('app_users').insert(row);
  if (error) throw new Error(error.message);
  return fromRow(row);
}

export async function verifyCredentials(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  return verifyPassword(password, user.passwordHash) ? user : null;
}

export async function setResetCode(email: string) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const sb = getSupabase();
  await sb.from('app_users').update({
    reset_code: resetCode,
    reset_code_expires_at: Date.now() + 15 * 60 * 1000,
  }).eq('id', user.id);
  return resetCode;
}

export async function resetPasswordWithCode(email: string, code: string, newPassword: string) {
  const user = await findUserByEmail(email);
  if (!user || !user.resetCode || user.resetCode !== code) throw new Error('Invalid or expired reset code.');
  if (!user.resetCodeExpiresAt || user.resetCodeExpiresAt < Date.now()) throw new Error('Reset code has expired.');
  const sb = getSupabase();
  await sb.from('app_users').update({
    password_hash: hashPassword(newPassword),
    reset_code: null,
    reset_code_expires_at: null,
  }).eq('id', user.id);
  return user;
}

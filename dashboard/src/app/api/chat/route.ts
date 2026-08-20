import { NextResponse } from 'next/server';
import { chatSeed } from '@/data/mock-data';

export async function GET() {
  return NextResponse.json(chatSeed);
}

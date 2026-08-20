import { NextResponse } from 'next/server';
import { drivers } from '@/data/mock-data';

export async function GET() {
  return NextResponse.json(drivers);
}

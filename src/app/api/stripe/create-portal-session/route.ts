import { NextRequest, NextResponse } from 'next/server';

// This API route is deprecated as payments are now handled via bank transfer.
export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'This payment method is no longer supported.' }, { status: 410 });
}

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'API çalışıyor!',
    timestamp: new Date().toISOString(),
    test: 'Başarılı'
  });
}


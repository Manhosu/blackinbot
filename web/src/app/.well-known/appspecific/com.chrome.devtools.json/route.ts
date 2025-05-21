import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    version: "1.0",
    app: "black-in-bot",
    capabilities: {
      debugger: true,
      network: true,
      console: true
    }
  });
} 
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ success: true, data: [] });
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: "Loan products are no longer supported" },
    { status: 404 }
  );
}

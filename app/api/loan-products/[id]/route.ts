import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { success: false, error: "Loan products are no longer supported" },
    { status: 404 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: "Loan products are no longer supported" },
    { status: 404 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: "Loan products are no longer supported" },
    { status: 404 }
  );
}

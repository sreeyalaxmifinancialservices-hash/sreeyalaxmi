import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      message: "Signup is currently disabled",
    },
    { status: 403 }
  );
}
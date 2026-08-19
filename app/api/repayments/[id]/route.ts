import { NextRequest, NextResponse } from "next/server";
import Repayment from "@/lib/models/Repayment";
import Loan from "@/lib/models/Loan";
import Member from "@/lib/models/Member";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    await requireAuth();

    const { id } = await params;
    const repayment = await Repayment.findById(id)
      .populate("loan", "loanNumber loanAmount weeklyRepayment")
      .populate("member", "firstName lastName memberCode phone")
      .lean();

    if (!repayment) {
      return NextResponse.json(
        { success: false, error: "Repayment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: repayment });
  } catch (error: any) {
    console.error(error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    await requireAuth();

    const { id } = await params;
    const body = await req.json();

    const repayment = await Repayment.findByIdAndUpdate(id, body, { new: true }).lean();

    if (!repayment) {
      return NextResponse.json(
        { success: false, error: "Repayment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: repayment, message: "Repayment updated successfully" });
  } catch (error: any) {
    console.error(error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Leader from "@/lib/models/Leader";
import Repayment from "@/lib/models/Repayment";
import Loan from "@/lib/models/Loan";
import Member from "@/lib/models/Member";
import Center from "@/lib/models/Center";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user || user.role !== "leader") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const leader = await Leader.findOne({ user: user._id }).lean();
    if (!leader) {
      return NextResponse.json(
        { success: false, error: "Leader record not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const centerId = searchParams.get("centerId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      center: leader.center,
    };

    if (centerId) filter.center = centerId;

    const [repayments, total] = await Promise.all([
      Repayment.find(filter)
        .populate("member", "firstName lastName phone")
        .populate("center", "name code")
        .populate("loan", "loanNumber")
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Repayment.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: repayments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user || user.role !== "leader") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const leader = await Leader.findOne({ user: user._id }).lean();
    if (!leader) {
      return NextResponse.json(
        { success: false, error: "Leader record not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      loanId,
      amount,
      principal,
      interest,
      insurance,
      savings,
      advance,
      paymentMethod,
      remarks,
    } = body;

    if (!loanId || !amount) {
      return NextResponse.json(
        { success: false, error: "Loan ID and amount are required" },
        { status: 400 }
      );
    }

    const loan = await Loan.findOne({
      _id: loanId,
      center: leader.center,
    }).lean();

    if (!loan) {
      return NextResponse.json(
        { success: false, error: "Loan not found in your assigned centers" },
        { status: 404 }
      );
    }

    const repaymentCount = await Repayment.countDocuments({
      loan: loanId,
      status: "completed",
    });

    const newOutstanding = loan.outstandingBalance - (principal || amount);

    const repayment = await Repayment.create({
      repaymentNumber: `REP-${Date.now()}`,
      loan: loanId,
      member: loan.member,
      branch: loan.branch,
      center: loan.center,
      amount,
      principal: principal || amount,
      interest: interest || 0,
      insurance: insurance || 0,
      savings: savings || 0,
      advance: advance || 0,
      outstandingBalance: newOutstanding > 0 ? newOutstanding : 0,
      installmentNumber: repaymentCount + 1,
      paymentMethod: paymentMethod || "cash",
      paidBy: user._id,
      collectedBy: user._id,
      paymentDate: new Date(),
      weekNumber: repaymentCount + 1,
      remarks,
      status: "completed",
    });

    await Loan.findByIdAndUpdate(loanId, {
      $inc: { installmentsPaid: 1 },
      outstandingBalance: newOutstanding > 0 ? newOutstanding : 0,
      status: newOutstanding <= 0 ? "closed" : loan.status,
    });

    return NextResponse.json(
      { success: true, data: repayment },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import Loan from "@/lib/models/Loan";
import Member from "@/lib/models/Member";
import Branch from "@/lib/models/Branch";
import Center from "@/lib/models/Center";
import Group from "@/lib/models/Group";
import Leader from "@/lib/models/Leader";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { loanSchema } from "@/lib/validations";
import { getLoanConfig } from "@/lib/settings";
import { computeLoanBreakdown } from "@/lib/loan-calc";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const branch = searchParams.get("branch");
    const center = searchParams.get("center");
    const member = searchParams.get("member");
    const group = searchParams.get("group");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { loanId: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      const statuses = status.split(",").map((s) => s.trim());
      filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }
    if (branch) filter.branch = branch;
    if (center) filter.center = center;
    if (member) filter.member = member;
    if (group) filter.group = group;

    const [loans, total] = await Promise.all([
      Loan.find(filter)
        .populate("member", "firstName lastName memberCode phone")
        .populate("branch", "name code")
        .populate("center", "name code")
        .populate("group", "name code")
        .populate("leader", "firstName lastName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Loan.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: loans,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
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
    const user = await requireAuth();

    const body = await req.json();
    const parsed = loanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const config = await getLoanConfig();
    const noOfWeeks = config.defaultNoOfWeeks;
    const breakdown = computeLoanBreakdown(parsed.data.loanAmount, noOfWeeks, config);

    const loanCount = await Loan.countDocuments();
    const loanId = `LN${String(loanCount + 1).padStart(6, "0")}`;

    const existingLoansForMember = await Loan.countDocuments({ member: parsed.data.member });
    const cycleNumber = existingLoansForMember + 1;

    const loanData: Record<string, any> = {
      loanId,
      loanType: parsed.data.loanType,
      member: parsed.data.member,
      cycleNumber,
      loanAmount: parsed.data.loanAmount,
      insuranceAmount: breakdown.insuranceAmount,
      processingFee: breakdown.processingFee,
      loanFees: 0,
      disbursementAmount: breakdown.disbursementAmount,
      noOfWeeks,
      weeklyRepayment: breakdown.weeklyRepayment,
      totalRepayment: breakdown.totalRepayment,
      principalOutstanding: breakdown.principalOutstanding,
      outstandingBalance: breakdown.totalRepayment,
      disbursementDate: new Date(),
      maturityDate: new Date(Date.now() + noOfWeeks * 7 * 24 * 60 * 60 * 1000),
      disbursedBy: user.id,
      leader: parsed.data.leader,
      reason: parsed.data.reason,
      remarks: parsed.data.remarks,
      status: "pending",
      createdBy: user.id,
    };

    if (parsed.data.loanType === "group") {
      loanData.branch = parsed.data.branch;
      loanData.center = parsed.data.center;
      loanData.group = parsed.data.group;
    } else {
      loanData.bankName = parsed.data.bankName;
      loanData.bankBranchName = parsed.data.bankBranchName;
    }

    const loan = await Loan.create(loanData);

    return NextResponse.json(
      { success: true, data: loan, message: "Loan application created successfully" },
      { status: 201 }
    );
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

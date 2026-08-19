import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Staff from "@/lib/models/Staff";
import Loan from "@/lib/models/Loan";
import Member from "@/lib/models/Member";
import { loanSchema } from "@/lib/validations";
import { getLoanConfig } from "@/lib/settings";
import { computeLoanBreakdown } from "@/lib/loan-calc";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user || user.role !== "staff") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const staff = await Staff.findOne({ user: user._id }).lean();
    if (!staff) {
      return NextResponse.json(
        { success: false, error: "Staff record not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const centerId = searchParams.get("centerId");
    const status = searchParams.get("status");
    const all = searchParams.get("all") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      center: { $in: staff.assignedCenters },
    };

    if (all) {
      delete filter.createdBy;
    } else {
      filter.createdBy = user._id;
    }

    if (centerId) filter.center = centerId;
    if (status) {
      const statuses = status.split(",").map((s) => s.trim());
      filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }

    const [loans, total] = await Promise.all([
      Loan.find(filter)
        .populate("member", "firstName lastName memberCode")
        .populate("center", "name code")
        .populate("branch", "name code")
        .populate("group", "name code")
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
    if (!user || user.role !== "staff") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

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
      createdBy: user._id,
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

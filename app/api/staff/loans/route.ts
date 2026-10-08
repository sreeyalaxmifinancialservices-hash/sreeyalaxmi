import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Staff from "@/lib/models/Staff";
import Loan from "@/lib/models/Loan";
import Member from "@/lib/models/Member";
import { loanSchema } from "@/lib/validations";
import { getLoanConfig } from "@/lib/settings";
import { computeLoanBreakdown } from "@/lib/loan-calc";

async function generateUniqueLoanId(): Promise<string> {
  const lastLoan = await Loan.findOne()
    .sort({ loanId: -1 })
    .select("loanId")
    .lean<{ loanId: string }>();
  let nextNum = 1;
  if (lastLoan?.loanId) {
    const match = lastLoan.loanId.match(/(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  for (let i = 0; i < 100; i++) {
    const candidate = `LN${String(nextNum).padStart(6, "0")}`;
    const exists = await Loan.exists({ loanId: candidate });
    if (!exists) return candidate;
    nextNum++;
  }
  return `LN${String(Date.now()).slice(-6)}`;
}

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
    const search = searchParams.get("search") || "";
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

    if (search.trim()) {
      const q = search.trim();
      const parts = q.split(/\s+/).filter(Boolean);
      const memberOr: Record<string, any>[] = [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { memberCode: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
      if (parts.length > 1) {
        memberOr.push({
          $and: [
            { firstName: { $regex: parts[0], $options: "i" } },
            { lastName: { $regex: parts.slice(1).join(" "), $options: "i" } },
          ],
        });
      }
      const matchingMembers = await Member.find({ $or: memberOr })
        .select("_id")
        .limit(200)
        .lean();
      filter.$or = [
        { loanId: { $regex: q, $options: "i" } },
        { member: { $in: matchingMembers.map((m) => m._id) } },
      ];
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

    const existingLoansForMember = await Loan.countDocuments({ member: parsed.data.member });
    const cycleNumber = existingLoansForMember + 1;

    // Historical / migrated loan: recorded directly as closed
    if (parsed.data.loanType === "old") {
      const opening = new Date(parsed.data.openingDate as string);
      const closure = new Date(parsed.data.closureDate as string);
      const totalReceived = parsed.data.totalReceived as number;
      for (let attempt = 0; attempt < 5; attempt++) {
        const loanId = await generateUniqueLoanId();
        try {
          const oldLoan = await Loan.create({
            loanId,
            loanType: "old",
            member: parsed.data.member,
            branch: parsed.data.branch,
            center: parsed.data.center,
            group: parsed.data.group,
            cycleNumber,
            loanAmount: parsed.data.loanAmount,
            insuranceAmount: 0,
            processingFee: 0,
            loanFees: 0,
            disbursementAmount: parsed.data.loanAmount,
            noOfWeeks: 1,
            weeklyRepayment: totalReceived,
            totalRepayment: totalReceived,
            principalOutstanding: 0,
            outstandingBalance: 0,
            installmentsPaid: 1,
            disbursementDate: opening,
            maturityDate: closure,
            disbursedBy: user.id,
            preCloseDate: closure,
            preCloseAmount: totalReceived,
            closureRemark: parsed.data.remarks || "",
            closedBy: user.id,
            closedAt: closure,
            reason: parsed.data.reason,
            remarks: parsed.data.remarks,
            status: "closed",
            createdBy: user._id,
          });

          return NextResponse.json(
            { success: true, data: oldLoan, message: "Old loan recorded successfully" },
            { status: 201 }
          );
        } catch (err: any) {
          if (err?.code === 11000 && err?.keyPattern?.loanId) continue;
          throw err;
        }
      }
      return NextResponse.json(
        { success: false, error: "Could not generate a unique loan ID, please retry" },
        { status: 409 }
      );
    }

    const noOfWeeks = config.defaultNoOfWeeks;
    const breakdown = computeLoanBreakdown(parsed.data.loanAmount, noOfWeeks, config);

    const baseLoanData: Record<string, any> = {
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
      baseLoanData.branch = parsed.data.branch;
      baseLoanData.center = parsed.data.center;
      baseLoanData.group = parsed.data.group;
    } else {
      baseLoanData.bankName = parsed.data.bankName;
      baseLoanData.bankBranchName = parsed.data.bankBranchName;
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const loan = await Loan.create({
          ...baseLoanData,
          loanId: await generateUniqueLoanId(),
        });
        return NextResponse.json(
          { success: true, data: loan, message: "Loan application created successfully" },
          { status: 201 }
        );
      } catch (err: any) {
        if (err?.code === 11000 && err?.keyPattern?.loanId) continue;
        throw err;
      }
    }

    return NextResponse.json(
      { success: false, error: "Could not generate a unique loan ID, please retry" },
      { status: 409 }
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

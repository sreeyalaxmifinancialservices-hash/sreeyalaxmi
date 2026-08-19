import { NextRequest, NextResponse } from "next/server";
import Member from "@/lib/models/Member";
import Loan from "@/lib/models/Loan";
import Staff from "@/lib/models/Staff";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function computeStats(loans: any[]) {
  const totalLoans = loans.length;
  const activeLoans = loans.filter((l) => ["disbursed", "active"].includes(l.status)).length;
  const closedLoans = loans.filter((l) => ["closed", "preclosed"].includes(l.status)).length;
  const defaultedLoans = loans.filter((l) => l.status === "defaulted").length;
  const totalBorrowed = loans.reduce((sum, l) => sum + (Number(l.loanAmount) || 0), 0);
  const outstandingBalance = loans.reduce((sum, l) => sum + (Number(l.outstandingBalance) || 0), 0);
  const totalRepaid = loans.reduce(
    (sum, l) => sum + Math.max((Number(l.totalRepayment) || 0) - (Number(l.outstandingBalance) || 0), 0),
    0
  );

  return {
    totalLoans,
    activeLoans,
    closedLoans,
    defaultedLoans,
    totalBorrowed,
    outstandingBalance,
    totalRepaid,
  };
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
    const center = searchParams.get("center");
    const memberId = searchParams.get("memberId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const centerFilter: Record<string, any> = {
      center: { $in: staff.assignedCenters },
    };

    if (memberId) {
      const member = await Member.findOne({ _id: memberId, ...centerFilter })
        .populate("branch", "name code")
        .populate("center", "name code")
        .populate("group", "name code")
        .lean();

      if (!member) {
        return NextResponse.json(
          { success: false, error: "Member not found" },
          { status: 404 }
        );
      }

      const loans = await Loan.find({ member: memberId })
        .populate("branch", "name code")
        .populate("center", "name code")
        .populate("group", "name code")
        .populate("leader", "firstName lastName")
        .sort({ cycleNumber: 1 })
        .lean();

      return NextResponse.json({
        success: true,
        data: { ...member, loanStats: computeStats(loans), loans },
      });
    }

    const filter: Record<string, any> = { ...centerFilter };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { memberCode: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { aadhaar: { $regex: search, $options: "i" } },
      ];
    }

    if (center) filter.center = center;

    const [members, total] = await Promise.all([
      Member.find(filter)
        .populate("branch", "name code")
        .populate("center", "name code")
        .populate("group", "name code")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Member.countDocuments(filter),
    ]);

    const ids = members.map((m) => m._id);

    const loans = ids.length
      ? await Loan.find({ member: { $in: ids } })
          .populate("branch", "name code")
          .populate("center", "name code")
          .populate("group", "name code")
          .sort({ cycleNumber: 1 })
          .lean()
      : [];

    const loansByMember = new Map<string, any[]>();
    for (const loan of loans) {
      const key = String(loan.member);
      if (!loansByMember.has(key)) loansByMember.set(key, []);
      loansByMember.get(key)!.push(loan);
    }

    const data = members.map((m) => {
      const memberLoans = loansByMember.get(String(m._id)) || [];
      return { ...m, loanStats: computeStats(memberLoans), loans: memberLoans };
    });

    return NextResponse.json({
      success: true,
      data,
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

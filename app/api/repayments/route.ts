import { NextRequest, NextResponse } from "next/server";
import Repayment from "@/lib/models/Repayment";
import Loan from "@/lib/models/Loan";
import Member from "@/lib/models/Member";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { repaymentSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const loan = searchParams.get("loan");
    const member = searchParams.get("member");
    const branch = searchParams.get("branch");
    const center = searchParams.get("center");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (loan) filter.loan = loan;
    if (member) filter.member = member;
    if (branch) filter.branch = branch;
    if (center) filter.center = center;

    if (dateFrom || dateTo) {
      filter.paymentDate = {};
      if (dateFrom) filter.paymentDate.$gte = new Date(dateFrom);
      if (dateTo) filter.paymentDate.$lte = new Date(dateTo);
    }

    const [repayments, total] = await Promise.all([
      Repayment.find(filter)
        .populate("loan", "loanId loanAmount")
        .populate("member", "firstName lastName memberCode")
        .sort({ createdAt: -1 })
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
    const parsed = repaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const loan = await Loan.findById(parsed.data.loan).lean();
    if (!loan) {
      return NextResponse.json(
        { success: false, error: "Loan not found" },
        { status: 404 }
      );
    }

    if (loan.outstandingBalance <= 0) {
      return NextResponse.json(
        { success: false, error: "Loan is already fully paid" },
        { status: 400 }
      );
    }

    if (parsed.data.principal > loan.outstandingBalance) {
      return NextResponse.json(
        { success: false, error: "Payment amount exceeds outstanding balance" },
        { status: 400 }
      );
    }

    const newOutstanding = loan.outstandingBalance - parsed.data.principal;
    const newPrincipalOS = loan.principalOutstanding - parsed.data.principal;
    const installmentNumber = loan.installmentsPaid + 1;

    const repaymentCount = await Repayment.countDocuments();
    const repaymentId = `RP${String(repaymentCount + 1).padStart(6, "0")}`;

    const paymentDate = new Date(parsed.data.paymentDate);
    const weekNumber = Math.ceil(
      (paymentDate.getTime() - (loan.disbursementDate ? new Date(loan.disbursementDate).getTime() : paymentDate.getTime())) / (7 * 24 * 60 * 60 * 1000)
    );

    const total = parsed.data.principal + parsed.data.sbSavings + parsed.data.insuranceAmount + parsed.data.sd + parsed.data.loanFees;
    const collectionAmount = parsed.data.principal + parsed.data.sbSavings;

    const repayment = await Repayment.create({
      repaymentId,
      loan: parsed.data.loan,
      member: loan.member,
      branch: loan.branch,
      center: loan.center,
      principal: parsed.data.principal,
      loanOutstanding: Math.round(newOutstanding * 100) / 100,
      insuranceAmount: parsed.data.insuranceAmount,
      sd: parsed.data.sd,
      sbSavings: parsed.data.sbSavings,
      collectionAmount: Math.round(collectionAmount * 100) / 100,
      dueAmount: parsed.data.dueAmount,
      previousDue: parsed.data.previousDue,
      advanceAmount: parsed.data.advanceAmount,
      loanFees: parsed.data.loanFees,
      preClose: parsed.data.preClose,
      total: Math.round(total * 100) / 100,
      installmentNumber,
      noOfWeeksPaid: parsed.data.noOfWeeksPaid,
      paymentMethod: parsed.data.paymentMethod,
      paidBy: user.id,
      collectedBy: user.id,
      paymentDate,
      weekNumber: Math.max(1, weekNumber),
      remarks: parsed.data.remarks,
      status: "completed",
    });

    await Loan.findByIdAndUpdate(parsed.data.loan, {
      outstandingBalance: Math.round(newOutstanding * 100) / 100,
      principalOutstanding: Math.max(0, Math.round(newPrincipalOS * 100) / 100),
      installmentsPaid: installmentNumber,
      status: newOutstanding <= 0 ? "closed" : loan.status,
    });

    return NextResponse.json(
      { success: true, data: repayment, message: "Repayment recorded successfully" },
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

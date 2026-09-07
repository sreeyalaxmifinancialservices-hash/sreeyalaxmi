import { NextRequest, NextResponse } from "next/server";
import Loan from "@/lib/models/Loan";
import Repayment from "@/lib/models/Repayment";
import Member from "@/lib/models/Member";
import Branch from "@/lib/models/Branch";
import Center from "@/lib/models/Center";
import Group from "@/lib/models/Group";
import Leader from "@/lib/models/Leader";
import User from "@/lib/models/User";
import { connectDB } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    const loan = await Loan.findById(id)
      .populate("member", "firstName lastName memberCode phone")
      .populate("loanProduct", "name code interestRate tenureWeeks")
      .populate("branch", "name code")
      .populate("center", "name code")
      .populate("group", "name code")
      .populate("leader", "firstName lastName")
      .populate("disbursedBy", "name email")
      .lean();

    if (!loan) {
      return NextResponse.json(
        { success: false, error: "Loan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: loan });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { status, remarks } = body;

    const loan = await Loan.findById(id);
    if (!loan) {
      return NextResponse.json(
        { success: false, error: "Loan not found" },
        { status: 404 }
      );
    }

    const user = await requireAuth();

    if (status === "approved") {
      if (!["admin"].includes(user.role)) {
        return NextResponse.json(
          { success: false, error: "Only admin can approve loans" },
          { status: 403 }
        );
      }
      if (loan.status !== "pending") {
        return NextResponse.json(
          { success: false, error: "Can only approve pending loans" },
          { status: 400 }
        );
      }
      loan.status = "approved";
      loan.approvedBy = user.id;
      loan.approvedAt = new Date();
    } else if (status === "disbursed") {
      if (!["admin", "staff"].includes(user.role)) {
        return NextResponse.json(
          { success: false, error: "Only admin or staff can disburse loans" },
          { status: 403 }
        );
      }
      if (loan.status !== "approved") {
        return NextResponse.json(
          { success: false, error: "Can only disburse approved loans" },
          { status: 400 }
        );
      }
      loan.status = "disbursed";
      loan.disbursementDate = new Date();
      loan.outstandingBalance = loan.totalRepayment || loan.loanAmount;
    } else if (status === "active") {
      if (!["admin", "staff"].includes(user.role)) {
        return NextResponse.json(
          { success: false, error: "Only admin or staff can activate loans" },
          { status: 403 }
        );
      }
      if (loan.status !== "disbursed") {
        return NextResponse.json(
          { success: false, error: "Can only activate disbursed loans" },
          { status: 400 }
        );
      }
      loan.status = "active";
    } else if (status === "rejected") {
      if (!["admin"].includes(user.role)) {
        return NextResponse.json(
          { success: false, error: "Only admin can reject loans" },
          { status: 403 }
        );
      }
      if (loan.status !== "pending") {
        return NextResponse.json(
          { success: false, error: "Can only reject pending loans" },
          { status: 400 }
        );
      }
      loan.status = "rejected";
      loan.remarks = remarks || "";
    } else if (status === "closed") {
      if (!["admin", "staff"].includes(user.role)) {
        return NextResponse.json(
          { success: false, error: "Only admin or staff can close loans" },
          { status: 403 }
        );
      }
      // Allow adding/updating remark on already closed loans (auto-closed loans have no remark)
      if (loan.status === "closed") {
        loan.closureRemark = remarks || loan.closureRemark || "";
        if (remarks) loan.remarks = remarks;
        // ensure dates exist for auto-closed loans that were missing them
        if (!loan.closedAt) loan.closedAt = new Date();
        if (!loan.preCloseDate) loan.preCloseDate = loan.closedAt;
        await loan.save();
        return NextResponse.json({
          success: true,
          data: loan,
          message: "Closure remark updated successfully",
        });
      }
      if (!["active", "disbursed", "approved"].includes(loan.status)) {
        return NextResponse.json(
          { success: false, error: "Loan cannot be closed from current status" },
          { status: 400 }
        );
      }
      loan.status = "closed";
      loan.closedBy = user.id;
      loan.closedAt = new Date();
      loan.closureRemark = remarks || "";

      const outstandingAmount = loan.outstandingBalance || 0;
      if (outstandingAmount > 0) {
        const repaymentCount = await Repayment.countDocuments();
        const repaymentId = `RP${String(repaymentCount + 1).padStart(6, "0")}`;

        const paymentDate = new Date();
        const weekNumber = loan.disbursementDate
          ? Math.ceil(
              (paymentDate.getTime() - new Date(loan.disbursementDate).getTime()) /
                (7 * 24 * 60 * 60 * 1000)
            )
          : 1;

        const installmentNumber = (loan.installmentsPaid || 0) + 1;
        const remainingWeeks = (loan.noOfWeeks || 50) - (loan.installmentsPaid || 0);

        await Repayment.create({
          repaymentId,
          loan: loan._id,
          member: loan.member,
          branch: loan.branch,
          center: loan.center,
          principal: outstandingAmount,
          loanOutstanding: 0,
          insuranceAmount: 0,
          sd: 0,
          sbSavings: 0,
          collectionAmount: outstandingAmount,
          dueAmount: 0,
          previousDue: 0,
          advanceAmount: 0,
          loanFees: 0,
          preClose: outstandingAmount,
          total: outstandingAmount,
          installmentNumber,
          noOfWeeksPaid: Math.max(1, remainingWeeks),
          paymentMethod: "cash",
          paidBy: user.id,
          collectedBy: user.id,
          paymentDate,
          weekNumber: Math.max(1, weekNumber),
          remarks: remarks || "Loan closed - outstanding amount settled",
          status: "completed",
        });

        loan.outstandingBalance = 0;
        loan.principalOutstanding = 0;
      }
    } else if (status === "preclosed") {
      loan.status = "preclosed";
      loan.preCloseDate = new Date();
      loan.preCloseAmount = loan.outstandingBalance;
      loan.outstandingBalance = 0;
      loan.closedAt = new Date();
      loan.closureRemark = remarks || loan.closureRemark;
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid status transition" },
        { status: 400 }
      );
    }

    if (remarks) loan.remarks = remarks;
    await loan.save();

    return NextResponse.json({
      success: true,
      data: loan,
      message: `Loan ${status} successfully`,
    });
  } catch (error: any) {
    console.error(error);
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

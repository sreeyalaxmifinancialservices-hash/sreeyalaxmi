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
import { applyLoanEdits, parseLoanDate, pickLoanChanges } from "@/lib/loan-edit";

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

    // Direct edits (no status change) are admin-only.
    // Staff corrections go through the edit-request approval flow.
    if (!status) {
      if (user.role !== "admin") {
        return NextResponse.json(
          { success: false, error: "Loan edits need admin approval. Please submit an edit request." },
          { status: 403 }
        );
      }
      const changes = pickLoanChanges(body);
      if (Object.keys(changes).length === 0) {
        return NextResponse.json(
          { success: false, error: "Nothing to update" },
          { status: 400 }
        );
      }
      const failure = await applyLoanEdits(loan, changes);
      if (failure) {
        return NextResponse.json(
          { success: false, error: failure.error },
          { status: failure.status }
        );
      }
      await loan.save();
      return NextResponse.json({
        success: true,
        data: loan,
        message: "Loan updated successfully",
      });
    }

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
      const customDisbursement = parseLoanDate(body.disbursementDate);
      loan.disbursementDate = customDisbursement || new Date();
      const disbWeeks = loan.noOfWeeks || 50;
      loan.maturityDate = new Date(
        new Date(loan.disbursementDate).getTime() + disbWeeks * 7 * 24 * 60 * 60 * 1000
      );
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
        const customClosed = parseLoanDate(body.closedAt);
        const customPreClose = parseLoanDate(body.preCloseDate);
        if (!loan.closedAt) loan.closedAt = customClosed || new Date();
        else if (customClosed) loan.closedAt = customClosed;
        if (!loan.preCloseDate) loan.preCloseDate = customPreClose || loan.closedAt;
        else if (customPreClose) loan.preCloseDate = customPreClose;
        else if (customClosed) loan.preCloseDate = customClosed;
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
      const customClosedAt = parseLoanDate(body.closedAt);
      const customPreCloseDate = parseLoanDate(body.preCloseDate);
      loan.closedAt = customClosedAt || new Date();
      loan.preCloseDate = customPreCloseDate || loan.closedAt;
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
      const customPre = parseLoanDate(body.preCloseDate);
      const customClosedPre = parseLoanDate(body.closedAt);
      loan.preCloseDate = customPre || new Date();
      loan.preCloseAmount = loan.outstandingBalance;
      loan.outstandingBalance = 0;
      loan.closedAt = customClosedPre || new Date();
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    const user = await requireAuth();

    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only admin can delete loans" },
        { status: 403 }
      );
    }

    const loan = await Loan.findById(id);
    if (!loan) {
      return NextResponse.json(
        { success: false, error: "Loan not found" },
        { status: 404 }
      );
    }

    // Protect financial history: loans with repayments cannot be deleted
    const repaymentCount = await Repayment.countDocuments({ loan: id });
    if (repaymentCount > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete loan with repayments recorded. Close the loan instead." },
        { status: 400 }
      );
    }

    await Loan.findByIdAndDelete(id);

    // Auto-reject any pending loan edit requests for the deleted loan
    try {
      const Inquiry = (await import("@/lib/models/Inquiry")).default;
      await Inquiry.updateMany(
        { type: "loan_edit", "editRequest.entityId": id, status: "pending" },
        {
          $set: { status: "rejected", remarks: "Loan was deleted" },
          $push: {
            history: {
              action: "Auto-rejected: loan deleted",
              date: new Date(),
              remarks: "Loan was deleted",
            },
          },
        }
      );
    } catch (e) {
      console.error("Failed to cleanup loan edit requests:", e);
    }

    return NextResponse.json({ success: true, message: "Loan deleted successfully" });
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

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import GroupAssignedCollection from "@/lib/models/GroupAssignedCollection";
import Repayment from "@/lib/models/Repayment";
import Loan from "@/lib/models/Loan";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { action, reviewedBy } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const assignment = await GroupAssignedCollection.findById(id);
    if (!assignment) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    if (assignment.status !== "Pending Review") {
      return NextResponse.json(
        { success: false, error: "Assignment is not pending review" },
        { status: 400 }
      );
    }

    if (action === "reject") {
      assignment.status = "Pending";
      assignment.members = assignment.members.map((m: any) => ({
        ...m,
        status: "Pending Review",
        collectedAmount: 0,
        remaining: m.totalAmount,
      }));
      assignment.totalCollected = 0;
      assignment.totalPending = assignment.members.reduce(
        (sum: number, m: any) => sum + m.totalAmount,
        0
      );
      assignment.reviewedBy = reviewedBy;
      assignment.reviewedAt = new Date();
      assignment.markModified("members");
      await assignment.save();
      return NextResponse.json({ success: true, data: assignment });
    }

    const repaymentCount = await Repayment.countDocuments();
    let createdRepayments = 0;

    for (const member of assignment.members) {
      if (member.status === "Paid" || member.status === "Partial") {
        if (member.collectedAmount <= 0) continue;

        const loan = await Loan.findById(member.loanId);
        if (!loan) continue;

        const installmentNumber = loan.installmentsPaid + 1;
        const paymentDate = new Date(assignment.collectionDate);
        const weekNumber = Math.ceil(
          (paymentDate.getTime() -
            (loan.disbursementDate
              ? new Date(loan.disbursementDate).getTime()
              : paymentDate.getTime())) /
            (7 * 24 * 60 * 60 * 1000)
        );

        const repaymentId = `RP${String(repaymentCount + createdRepayments + 1).padStart(6, "0")}`;
        const principal = member.collectedAmount;
        const newOutstanding = Math.max(0, loan.outstandingBalance - principal);
        const newPrincipalOS = Math.max(0, loan.principalOutstanding - principal);

        await Repayment.create({
          repaymentId,
          loan: member.loanId,
          member: member.memberId,
          branch: assignment.branchId,
          center: assignment.centerId,
          principal,
          loanOutstanding: Math.round(newOutstanding * 100) / 100,
          insuranceAmount: 0,
          sd: 0,
          sbSavings: 0,
          collectionAmount: Math.round(principal * 100) / 100,
          dueAmount: 0,
          previousDue: member.previousRemaining,
          advanceAmount: 0,
          loanFees: 0,
          preClose: 0,
          total: Math.round(principal * 100) / 100,
          installmentNumber,
          noOfWeeksPaid: 1,
          paymentMethod: "cash",
          paidBy: reviewedBy,
          collectedBy: reviewedBy,
          paymentDate,
          weekNumber: Math.max(1, weekNumber),
          remarks: member.status === "Partial"
            ? `Partial payment. Remaining ₹${member.remaining} carried forward.`
            : undefined,
          status: "completed",
        });

        await Loan.findByIdAndUpdate(member.loanId, {
          outstandingBalance: Math.round(newOutstanding * 100) / 100,
          principalOutstanding: Math.round(newPrincipalOS * 100) / 100,
          installmentsPaid: installmentNumber,
          status: newOutstanding <= 0 ? "closed" : loan.status,
        });

        if (member.status === "Paid") {
          member.remaining = 0;
        } else {
          member.remaining = Math.max(0, member.totalAmount - member.collectedAmount);
        }

        createdRepayments++;
      } else if (member.status === "Unpaid") {
        const loan = await Loan.findById(member.loanId);
        if (loan) {
          const installmentNumber = loan.installmentsPaid + 1;
          const paymentDate = new Date(assignment.collectionDate);
          const weekNumber = Math.ceil(
            (paymentDate.getTime() -
              (loan.disbursementDate
                ? new Date(loan.disbursementDate).getTime()
                : paymentDate.getTime())) /
              (7 * 24 * 60 * 60 * 1000)
          );

          const repaymentId = `RP${String(repaymentCount + createdRepayments + 1).padStart(6, "0")}`;

          await Repayment.create({
            repaymentId,
            loan: member.loanId,
            member: member.memberId,
            branch: assignment.branchId,
            center: assignment.centerId,
            principal: 0,
            loanOutstanding: loan.outstandingBalance,
            insuranceAmount: 0,
            sd: 0,
            sbSavings: 0,
            collectionAmount: 0,
            dueAmount: 0,
            previousDue: member.previousRemaining,
            advanceAmount: 0,
            loanFees: 0,
            preClose: 0,
            total: 0,
            installmentNumber,
            noOfWeeksPaid: 1,
            paymentMethod: "cash",
            paidBy: reviewedBy,
            collectedBy: reviewedBy,
            paymentDate,
            weekNumber: Math.max(1, weekNumber),
            remarks: "Missed collection - no payment made",
            status: "missed",
          });

          await Loan.findByIdAndUpdate(member.loanId, {
            installmentsPaid: installmentNumber,
          });

          createdRepayments++;
        }

        member.remaining = member.totalAmount;
      }
    }

    let finalStatus: "Complete" | "Partial" | "Incomplete";
    if (assignment.totalPending === 0) {
      finalStatus = "Complete";
    } else if (assignment.totalCollected > 0) {
      finalStatus = "Partial";
    } else {
      finalStatus = "Incomplete";
    }

    assignment.status = finalStatus;
    assignment.reviewedBy = reviewedBy;
    assignment.reviewedAt = new Date();
    assignment.markModified("members");
    await assignment.save();

    const pendingAssignments = await GroupAssignedCollection.find({
      groupId: assignment.groupId,
      status: "Pending",
      _id: { $ne: assignment._id },
    }).lean();

    for (const pending of pendingAssignments) {
      const updatedMembers = pending.members.map((pm: any) => {
        const approvedMember = assignment.members.find(
          (am: any) => String(am.memberId) === String(pm.memberId)
        );
        if (approvedMember && pm.loanId) {
          const previousRemaining = approvedMember.remaining || 0;
          const totalAmount = pm.amountToCollect + previousRemaining;
          return {
            ...pm,
            previousRemaining,
            totalAmount,
            collectedAmount: 0,
            remaining: totalAmount,
          };
        }
        return pm;
      });

      const totalExpected = updatedMembers.reduce(
        (sum: number, m: any) => sum + m.totalAmount, 0
      );

      await GroupAssignedCollection.findByIdAndUpdate(pending._id, {
        members: updatedMembers,
        totalPending: totalExpected,
        totalCollected: 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: assignment,
      message: `Approved. ${createdRepayments} repayment(s) created.`,
    });
  } catch (error: any) {
    console.error("PUT /api/admin/group-assigned-collection/[id]/approve:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

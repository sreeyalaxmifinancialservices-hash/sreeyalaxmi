import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import GroupAssignedCollection from "@/lib/models/GroupAssignedCollection";
import Group from "@/lib/models/Group";
import Member from "@/lib/models/Member";
import Loan from "@/lib/models/Loan";
import Leader from "@/lib/models/Leader";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { groupId, staffId, staffName, collectionDate, branchId, centerId } = body;

    if (!groupId || !staffId || !collectionDate) {
      return NextResponse.json(
        { success: false, error: "groupId, staffId, and collectionDate are required" },
        { status: 400 }
      );
    }

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    const leader = await Leader.findOne({ group: groupId, status: "active" }).lean();

    const members = await Member.find({ group: groupId, status: "active" }).lean();

    if (members.length === 0) {
      return NextResponse.json(
        { success: false, error: "No active members found in this group" },
        { status: 400 }
      );
    }

    const memberIds = members.map((m) => m._id);
    const loans = await Loan.find({
      member: { $in: memberIds },
      status: { $in: ["disbursed", "active"] },
    }).lean();

    const memberLoanMap = new Map<string, any>();
    for (const loan of loans) {
      const memberId = String(loan.member);
      if (!memberLoanMap.has(memberId)) {
        memberLoanMap.set(memberId, loan);
      }
    }

    const previousAssignments = await GroupAssignedCollection.find({
      groupId: group._id,
      status: { $in: ["Complete", "Partial", "Incomplete", "Pending Review"] },
    })
      .sort({ collectionDate: -1, createdAt: -1 })
      .lean();

    const previousRemainingMap = new Map<string, number>();
    for (const pa of previousAssignments) {
      for (const pm of pa.members) {
        const pmId = String(pm.memberId);
        if (!previousRemainingMap.has(pmId)) {
          previousRemainingMap.set(pmId, pm.remaining);
        }
      }
    }

    const lastAssignment = await GroupAssignedCollection.findOne()
      .sort({ createdAt: -1 })
      .select("assignmentId")
      .lean();
    const lastNum = lastAssignment
      ? parseInt(lastAssignment.assignmentId.replace("GAC", ""), 10) || 0
      : 0;
    const assignmentId = `GAC${String(lastNum + 1).padStart(6, "0")}`;

    const memberPayments = [];
    for (const member of members) {
      const loan = memberLoanMap.get(String(member._id));
      if (loan) {
        const previousRemaining = previousRemainingMap.get(String(member._id)) || 0;
        const totalAmount = loan.weeklyRepayment + previousRemaining;

        memberPayments.push({
          memberId: member._id,
          memberName: `${member.firstName} ${member.lastName}`,
          loanId: loan._id,
          amountToCollect: loan.weeklyRepayment,
          previousRemaining,
          totalAmount,
          collectedAmount: 0,
          remaining: totalAmount,
          status: "Pending",
        });
      } else {
        memberPayments.push({
          memberId: member._id,
          memberName: `${member.firstName} ${member.lastName}`,
          loanId: null,
          amountToCollect: 0,
          previousRemaining: 0,
          totalAmount: 0,
          collectedAmount: 0,
          remaining: 0,
          status: "Paid",
        });
      }
    }

    const totalExpected = memberPayments.reduce((sum, m) => sum + m.totalAmount, 0);

    const assignment = await GroupAssignedCollection.create({
      assignmentId,
      branchId: branchId || group.branch,
      centerId: centerId || group.center,
      groupId: group._id,
      groupName: group.name,
      leaderId: leader?._id || null,
      leaderName: leader ? `${leader.firstName} ${leader.lastName}` : "",
      staffId,
      staffName,
      collectionDate: new Date(collectionDate),
      members: memberPayments,
      totalCollected: 0,
      totalPending: totalExpected,
      status: "Pending",
    });

    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/group-assigned-collection:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limitParam = searchParams.get("limit");
    const hasPagination = limitParam !== null;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = hasPagination ? parseInt(limitParam!) : 0;
    const skip = hasPagination ? (page - 1) * limit : 0;

    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const query = GroupAssignedCollection.find(filter)
      .populate("branchId", "name")
      .populate("centerId", "name")
      .populate("groupId", "name code")
      .populate("staffId", "firstName lastName email phone")
      .sort({ createdAt: -1 });

    const [data, total] = await Promise.all([
      (hasPagination ? query.skip(skip).limit(limit) : query).lean(),
      GroupAssignedCollection.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: hasPagination
        ? { page, limit, total, pages: Math.ceil(total / limit) }
        : { page: 1, limit: total, total, pages: 1 },
    });
  } catch (error: any) {
    console.error("GET /api/group-assigned-collection:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

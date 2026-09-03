import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import GroupAssignedCollection from "@/lib/models/GroupAssignedCollection";
import Group from "@/lib/models/Group";
import Member from "@/lib/models/Member";
import Loan from "@/lib/models/Loan";
import Leader from "@/lib/models/Leader";

async function createAssignmentForGroup(
  group: any,
  staffId: string,
  staffName: string,
  collectionDate: string,
  branchId: string | undefined,
  centerId: string | undefined,
  lastNumRef: { value: number }
) {
  const centerIdForLeader = centerId || group.center;
  const leader = await Leader.findOne({ center: centerIdForLeader, status: "active" }).lean();

  const members = await Member.find({ group: group._id, status: "active" }).lean();
  if (members.length === 0) return null;

  const memberIds = members.map((m) => m._id);
  const loans = await Loan.find({
    member: { $in: memberIds },
    status: { $in: ["disbursed", "active"] },
  }).lean();

  const memberLoanMap = new Map<string, any>();
  for (const loan of loans) {
    const memberId = String(loan.member);
    if (!memberLoanMap.has(memberId)) memberLoanMap.set(memberId, loan);
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
      if (!previousRemainingMap.has(pmId)) previousRemainingMap.set(pmId, pm.remaining);
    }
  }

  lastNumRef.value += 1;
  const assignmentId = `GAC${String(lastNumRef.value).padStart(6, "0")}`;

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
  return assignment;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { groupId, staffId, staffName, collectionDate, branchId, centerId } = body;

    if (!staffId || !collectionDate) {
      return NextResponse.json(
        { success: false, error: "staffId and collectionDate are required" },
        { status: 400 }
      );
    }

    // Bulk center assignment: all groups under center
    if (centerId && !groupId) {
      const groups = await Group.find({ center: centerId }).lean();
      if (groups.length === 0) {
        return NextResponse.json({ success: false, error: "No groups found under this center" }, { status: 400 });
      }
      const lastAssignment = await GroupAssignedCollection.findOne().sort({ createdAt: -1 }).select("assignmentId").lean();
      const lastNum = lastAssignment ? parseInt(lastAssignment.assignmentId.replace("GAC", ""), 10) || 0 : 0;
      const ref = { value: lastNum };
      const created = [];
      for (const grp of groups) {
        const assignment = await createAssignmentForGroup(grp, staffId, staffName, collectionDate, branchId, centerId, ref);
        if (assignment) created.push(assignment);
      }
      return NextResponse.json({ success: true, data: created, message: `${created.length} assignments created for center` }, { status: 201 });
    }

    // Single group assignment (backward compat)
    if (!groupId) {
      return NextResponse.json({ success: false, error: "groupId or centerId required" }, { status: 400 });
    }

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }
    const lastAssignment2 = await GroupAssignedCollection.findOne().sort({ createdAt: -1 }).select("assignmentId").lean();
    const lastNum2 = lastAssignment2 ? parseInt(lastAssignment2.assignmentId.replace("GAC", ""), 10) || 0 : 0;
    const ref2 = { value: lastNum2 };
    const assignment = await createAssignmentForGroup(group, staffId, staffName, collectionDate, branchId, centerId, ref2);
    if (!assignment) {
      return NextResponse.json({ success: false, error: "No active members found in this group" }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/center-assigned-collection:", error);
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
    console.error("GET /api/center-assigned-collection:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

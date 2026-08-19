import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import GroupAssignedCollection from "@/lib/models/GroupAssignedCollection";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { members } = body;

    if (!members || !Array.isArray(members)) {
      return NextResponse.json(
        { success: false, error: "members array is required" },
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

    if (assignment.status === "Complete" || assignment.status === "Pending Review") {
      return NextResponse.json(
        { success: false, error: "This assignment has already been submitted or completed" },
        { status: 400 }
      );
    }

    let totalCollected = 0;
    let totalPending = 0;

    const updatedMembers = assignment.members.map((existingMember: any) => {
      const submitted = members.find(
        (m: any) => String(m.memberId) === String(existingMember.memberId)
      );

      if (!submitted) return existingMember;

      const collectedAmount = Number(submitted.collectedAmount) || 0;
      const totalAmount = existingMember.totalAmount;
      const remaining = Math.max(0, totalAmount - collectedAmount);

      let status: "Paid" | "Partial" | "Unpaid" | "Pending Review";
      if (collectedAmount >= totalAmount) {
        status = "Paid";
      } else if (collectedAmount > 0) {
        status = "Partial";
      } else {
        status = "Unpaid";
      }

      totalCollected += collectedAmount;
      totalPending += remaining;

      return {
        ...existingMember.toObject(),
        collectedAmount,
        remaining,
        status,
      };
    });

    let assignmentStatus: "Pending" | "Pending Review" | "Complete" | "Partial" | "Incomplete";
    if (totalPending === 0) {
      assignmentStatus = "Complete";
    } else if (totalCollected > 0) {
      assignmentStatus = "Partial";
    } else {
      assignmentStatus = "Incomplete";
    }

    assignment.members = updatedMembers;
    assignment.totalCollected = totalCollected;
    assignment.totalPending = totalPending;
    assignment.status = "Pending Review";
    assignment.markModified("members");

    await assignment.save();

    return NextResponse.json({ success: true, data: assignment });
  } catch (error: any) {
    console.error("PUT /api/staff/group-assigned-collection/[id]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

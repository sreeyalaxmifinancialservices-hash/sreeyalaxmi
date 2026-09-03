import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import GroupAssignedCollection from "@/lib/models/GroupAssignedCollection";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const data = await GroupAssignedCollection.findById(id)
      .populate("branchId", "name")
      .populate("centerId", "name")
      .populate("groupId", "name code")
      .populate("staffId", "firstName lastName email phone")
      .populate("members.memberId", "firstName lastName phone memberCode")
      .lean();

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const assignment = await GroupAssignedCollection.findById(id);
    if (!assignment) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    if (body.members) {
      assignment.members = body.members;
    }
    if (body.status) {
      assignment.status = body.status;
    }
    if (body.totalCollected !== undefined) {
      assignment.totalCollected = body.totalCollected;
    }
    if (body.totalPending !== undefined) {
      assignment.totalPending = body.totalPending;
    }

    await assignment.save();

    return NextResponse.json({ success: true, data: assignment });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const deleted = await GroupAssignedCollection.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

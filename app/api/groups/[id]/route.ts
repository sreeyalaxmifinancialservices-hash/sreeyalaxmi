import { NextRequest, NextResponse } from "next/server";
import Group from "@/lib/models/Group";
import Center from "@/lib/models/Center";
import Branch from "@/lib/models/Branch";
import Leader from "@/lib/models/Leader";
import Member from "@/lib/models/Member";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { groupSchema } from "@/lib/validations";

async function generateLeaderId(): Promise<string> {
  const count = await Leader.countDocuments();
  return `LD${String(count + 1).padStart(6, "0")}`;
}

async function assignLeader(leaderValue: string, groupId: string) {
  const existingLeader = await Leader.findById(leaderValue).lean();
  if (existingLeader) return existingLeader._id;

  const member = await Member.findById(leaderValue).lean();
  if (member) {
    const existingForMember = await Leader.findOne({ member: member._id, group: groupId }).lean();
    if (existingForMember) return existingForMember._id;

    const leaderId = await generateLeaderId();
    const leader = await Leader.create({
      leaderId,
      firstName: member.firstName,
      lastName: member.lastName,
      phone: member.phone,
      email: member.email || `${member.memberCode}@member.local`,
      group: groupId,
      member: member._id,
      status: "active",
    });
    return leader._id;
  }

  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    await requireAuth();

    const { id } = await params;
    const group = await Group.findById(id)
      .populate("center", "name code")
      .populate("branch", "name code")
      .populate("leader", "firstName lastName phone member")
      .lean();

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: group });
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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    await requireAuth();

    const { id } = await params;
    const body = await req.json();
    const parsed = groupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = { ...parsed.data };

    if (parsed.data.leader) {
      const leaderId = await assignLeader(parsed.data.leader, id);
      if (leaderId) {
        updateData.leader = leaderId;
      }
    } else {
      updateData.leader = null;
    }

    const group = await Group.findByIdAndUpdate(id, updateData, { new: true }).lean();

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: group, message: "Group updated successfully" });
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    await requireAuth();

    const { id } = await params;
    const group = await Group.findByIdAndUpdate(
      id,
      { status: "inactive" },
      { new: true }
    ).lean();

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Group deactivated successfully" });
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

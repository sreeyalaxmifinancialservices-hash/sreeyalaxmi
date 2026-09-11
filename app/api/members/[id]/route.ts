import { NextRequest, NextResponse } from "next/server";
import Member from "@/lib/models/Member";
import Branch from "@/lib/models/Branch";
import Center from "@/lib/models/Center";
import Group from "@/lib/models/Group";
import { connectDB } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";
import { memberSchema } from "@/lib/validations";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    await requireAuth();

    const { id } = await params;
    const member = await Member.findById(id)
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

    return NextResponse.json({ success: true, data: member });
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

    const { id } = await params;
    const body = await req.json();

    const user = await requireAuth();

    const isUpdatingVerification = body.verificationStatus !== undefined;
    if (isUpdatingVerification && !["admin", "staff"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Only admin or staff can update verification status" },
        { status: 403 }
      );
    }

    if (isUpdatingVerification) {
      const member = await Member.findByIdAndUpdate(id, { verificationStatus: body.verificationStatus }, { new: true }).lean();
      if (!member) {
        return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: member, message: "Member updated successfully" });
    }

    const parsed = memberSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData = { ...parsed.data } as any;
    if (updateData.dob) {
      updateData.dob = new Date(updateData.dob);
    }

    if (updateData.group) {
      const existingMember = await Member.findById(id).lean();
      if (existingMember?.group?.toString() !== updateData.group.toString()) {
        await Group.findByIdAndUpdate(existingMember.group, { $inc: { memberCount: -1 } });
        await Group.findByIdAndUpdate(updateData.group, { $inc: { memberCount: 1 } });
      }
    }

    const member = await Member.findByIdAndUpdate(id, updateData, { new: true }).lean();

    if (!member) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: member, message: "Member updated successfully" });
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
    const member = await Member.findById(id).lean();

    if (!member) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    if (member.group) {
      await Group.findByIdAndUpdate(member.group, { $inc: { memberCount: -1 } });
    }

    // If this member was a leader (assigned to a center), remove the linked leader as well
    try {
      const Leader = (await import("@/lib/models/Leader")).default;
      const User = (await import("@/lib/models/User")).default;
      const leaders = await Leader.find({ member: id }).lean();
      for (const l of leaders) {
        if ((l as any).center) {
          await Center.findByIdAndUpdate((l as any).center, { $unset: { leader: "" } });
        }
        if ((l as any).user) {
          await User.findByIdAndDelete((l as any).user);
        }
        await Leader.findByIdAndDelete((l as any)._id);
      }
    } catch (e) {
      console.error("Failed to cleanup leader for deleted member:", e);
    }

    await Member.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Member deleted successfully" });
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
